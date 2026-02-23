import io
import os
import uuid
import zipfile
import shutil
from PIL import Image

ALLOWED_IMAGE_EXTENSIONS = {'jpg', 'jpeg', 'png', 'bmp', 'webp', 'tiff', 'tif', 'gif'}


class ImageBatchService:
    def __init__(self, batch_folder, export_folder):
        self.batch_folder = batch_folder
        self.export_folder = export_folder
        os.makedirs(batch_folder, exist_ok=True)
        os.makedirs(export_folder, exist_ok=True)

    def create_batch(self):
        """Create a new batch directory and return its ID."""
        batch_id = str(uuid.uuid4())
        batch_dir = os.path.join(self.batch_folder, batch_id)
        os.makedirs(batch_dir)
        os.makedirs(os.path.join(batch_dir, 'thumbnails'))
        return batch_id

    def save_image(self, batch_id, file):
        """
        Save an uploaded image to the batch.

        Returns dict: image_id, filename, width, height, ext
        """
        filename = os.path.basename(file.filename)
        ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
        if ext not in ALLOWED_IMAGE_EXTENSIONS:
            raise ValueError(f'Unsupported format: {ext}')

        image_id = str(uuid.uuid4())
        saved_filename = f'{image_id}.{ext}'
        batch_dir = os.path.join(self.batch_folder, batch_id)
        image_path = os.path.join(batch_dir, saved_filename)
        file.save(image_path)

        with Image.open(image_path) as img:
            width, height = img.size

        self._generate_thumbnail(image_path, batch_id, image_id)

        return {
            'image_id': image_id,
            'filename': filename,
            'saved_filename': saved_filename,
            'width': width,
            'height': height,
            'ext': ext,
        }

    def _generate_thumbnail(self, image_path, batch_id, image_id):
        """Generate a JPEG thumbnail (max 200×200) for browser display."""
        thumb_path = os.path.join(
            self.batch_folder, batch_id, 'thumbnails', f'{image_id}.jpg'
        )
        with Image.open(image_path) as img:
            img.thumbnail((200, 200), Image.LANCZOS)
            if img.mode != 'RGB':
                img = img.convert('RGB')
            img.save(thumb_path, 'JPEG', quality=75)

    def get_image_path(self, batch_id, image_id, thumbnail=False):
        """Return the filesystem path for an image or its thumbnail."""
        batch_dir = os.path.join(self.batch_folder, batch_id)
        if thumbnail:
            thumb = os.path.join(batch_dir, 'thumbnails', f'{image_id}.jpg')
            if os.path.exists(thumb):
                return thumb

        # Original file is stored as {image_id}.{ext}
        for fname in os.listdir(batch_dir):
            name, ext = os.path.splitext(fname)
            if name == image_id and ext and os.path.isfile(
                os.path.join(batch_dir, fname)
            ):
                return os.path.join(batch_dir, fname)

        return None

    def process_images(self, batch_id, image_settings_list, export_format='jpeg', quality=85):
        """
        Process images and return export info dict.

        Each entry in image_settings_list must contain:
            image_id          : str
            original_filename : str
            mode              : 'scale' | 'crop' | 'pad'
            max_width         : int   (scale only, 0 = no limit)
            max_height        : int   (scale only, 0 = no limit)
            ratio_w           : int   (crop/pad)
            ratio_h           : int   (crop/pad)
            output_width      : int|None  (optional final resize)
            output_height     : int|None
        """
        export_id = str(uuid.uuid4())
        export_dir = os.path.join(self.export_folder, export_id)
        os.makedirs(export_dir)

        try:
            processed = 0
            seen_names = {}

            for settings in image_settings_list:
                image_id = settings['image_id']
                original_filename = settings.get('original_filename', image_id)
                mode = settings.get('mode', 'scale')

                image_path = self.get_image_path(batch_id, image_id, thumbnail=False)
                if not image_path:
                    continue

                with Image.open(image_path) as img:
                    # Normalise colour mode
                    if img.mode == 'RGBA' and export_format in ('jpeg', 'jpg'):
                        bg = Image.new('RGB', img.size, (0, 0, 0))
                        bg.paste(img, mask=img.split()[3])
                        img = bg
                    elif img.mode not in ('RGB', 'RGBA'):
                        img = img.convert('RGB')
                    else:
                        img = img.copy()

                    anchor_x = float(settings.get('anchor_x', 0.5))
                    anchor_y = float(settings.get('anchor_y', 0.5))

                    if mode == 'scale':
                        img = self._scale_image(
                            img,
                            int(settings.get('max_width') or 0),
                            int(settings.get('max_height') or 0),
                        )
                    elif mode == 'crop':
                        img = self._crop_to_ratio(
                            img,
                            int(settings.get('ratio_w') or 16),
                            int(settings.get('ratio_h') or 9),
                            settings.get('output_width') or None,
                            settings.get('output_height') or None,
                            anchor_x, anchor_y,
                        )
                    elif mode == 'pad':
                        img = self._pad_to_ratio(
                            img,
                            int(settings.get('ratio_w') or 16),
                            int(settings.get('ratio_h') or 9),
                            settings.get('output_width') or None,
                            settings.get('output_height') or None,
                            anchor_x, anchor_y,
                        )

                    # Deduplicate output filenames
                    base, _ = os.path.splitext(original_filename)
                    ext_out = 'png' if export_format == 'png' else 'jpg'
                    out_name = f'{base}.{ext_out}'
                    if out_name in seen_names:
                        seen_names[out_name] += 1
                        out_name = f'{base}_{seen_names[out_name]}.{ext_out}'
                    else:
                        seen_names[out_name] = 0

                    out_path = os.path.join(export_dir, out_name)
                    if export_format == 'png':
                        if img.mode == 'RGBA':
                            img.save(out_path, 'PNG')
                        else:
                            img.convert('RGB').save(out_path, 'PNG')
                    else:
                        img.convert('RGB').save(out_path, 'JPEG', quality=int(quality))

                processed += 1

            if processed == 0:
                shutil.rmtree(export_dir)
                raise ValueError('No images could be processed')

            # Pack into ZIP
            zip_filename = f'{export_id}_processed_images.zip'
            zip_path = os.path.join(self.export_folder, zip_filename)
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
                for fname in os.listdir(export_dir):
                    zf.write(os.path.join(export_dir, fname), fname)

            shutil.rmtree(export_dir)

            return {
                'export_id': export_id,
                'processed_count': processed,
                'zip_filename': zip_filename,
            }

        except Exception:
            if os.path.exists(export_dir):
                shutil.rmtree(export_dir, ignore_errors=True)
            raise

    # ------------------------------------------------------------------ helpers

    def _scale_image(self, img, max_width, max_height):
        """
        Resize to fit within max_width × max_height while preserving aspect
        ratio. 0 means "no limit" on that axis.
        """
        w, h = img.size
        if max_width <= 0 and max_height <= 0:
            return img

        if max_width > 0 and max_height > 0:
            scale = min(max_width / w, max_height / h)
        elif max_width > 0:
            scale = max_width / w
        else:
            scale = max_height / h

        new_w = max(1, round(w * scale))
        new_h = max(1, round(h * scale))
        return img.resize((new_w, new_h), Image.LANCZOS)

    def _crop_to_ratio(self, img, ratio_w, ratio_h, output_width=None, output_height=None,
                       anchor_x=0.5, anchor_y=0.5):
        """
        Crop image to the target aspect ratio.
        anchor_x (0–1): which horizontal slice to keep (0=left, 0.5=center, 1=right).
        anchor_y (0–1): which vertical slice to keep  (0=top,  0.5=center, 1=bottom).
        """
        w, h = img.size
        target_ratio = ratio_w / ratio_h
        current_ratio = w / h

        if abs(current_ratio - target_ratio) > 0.001:
            if current_ratio > target_ratio:
                # Too wide → crop left and/or right
                new_w = round(h * target_ratio)
                left = round((w - new_w) * max(0.0, min(1.0, anchor_x)))
                img = img.crop((left, 0, left + new_w, h))
            else:
                # Too tall → crop top and/or bottom
                new_h = round(w / target_ratio)
                top = round((h - new_h) * max(0.0, min(1.0, anchor_y)))
                img = img.crop((0, top, w, top + new_h))

        img = self._apply_output_size(img, target_ratio, output_width, output_height)
        return img

    def _pad_to_ratio(self, img, ratio_w, ratio_h, output_width=None, output_height=None,
                      anchor_x=0.5, anchor_y=0.5):
        """
        Add black bars to achieve the target aspect ratio.
        anchor_x (0–1): where the image sits horizontally (0=left, 0.5=center, 1=right).
        anchor_y (0–1): where the image sits vertically  (0=top,  0.5=center, 1=bottom).
        """
        w, h = img.size
        target_ratio = ratio_w / ratio_h
        current_ratio = w / h

        if abs(current_ratio - target_ratio) > 0.001:
            if current_ratio > target_ratio:
                # Image too wide → bars on top/bottom
                new_h = round(w / target_ratio)
                canvas = Image.new('RGB', (w, new_h), (0, 0, 0))
                top = round((new_h - h) * max(0.0, min(1.0, anchor_y)))
                canvas.paste(img, (0, top))
                img = canvas
            else:
                # Image too tall → bars on sides
                new_w = round(h * target_ratio)
                canvas = Image.new('RGB', (new_w, h), (0, 0, 0))
                left = round((new_w - w) * max(0.0, min(1.0, anchor_x)))
                canvas.paste(img, (left, 0))
                img = canvas

        img = self._apply_output_size(img, target_ratio, output_width, output_height)
        return img

    def _apply_output_size(self, img, target_ratio, output_width, output_height):
        """Resize to explicit output dimensions if provided."""
        if output_width and output_height:
            img = img.resize((int(output_width), int(output_height)), Image.LANCZOS)
        elif output_width:
            ow = int(output_width)
            oh = max(1, round(ow / target_ratio))
            img = img.resize((ow, oh), Image.LANCZOS)
        elif output_height:
            oh = int(output_height)
            ow = max(1, round(oh * target_ratio))
            img = img.resize((ow, oh), Image.LANCZOS)
        return img

    def preview_image(self, batch_id, image_id, settings, max_size=900):
        """
        Process a single image with the given settings and return JPEG bytes.
        The result is downscaled to max_size pixels on the longest side for fast display.
        """
        image_path = self.get_image_path(batch_id, image_id, thumbnail=False)
        if not image_path:
            return None

        with Image.open(image_path) as img:
            if img.mode == 'RGBA':
                bg = Image.new('RGB', img.size, (0, 0, 0))
                bg.paste(img, mask=img.split()[3])
                img = bg
            elif img.mode != 'RGB':
                img = img.convert('RGB')
            else:
                img = img.copy()

            mode = settings.get('mode', 'scale')
            anchor_x = float(settings.get('anchor_x', 0.5))
            anchor_y = float(settings.get('anchor_y', 0.5))

            if mode == 'scale':
                img = self._scale_image(
                    img,
                    int(settings.get('max_width') or 0),
                    int(settings.get('max_height') or 0),
                )
            elif mode == 'crop':
                img = self._crop_to_ratio(
                    img,
                    int(settings.get('ratio_w') or 16),
                    int(settings.get('ratio_h') or 9),
                    settings.get('output_width') or None,
                    settings.get('output_height') or None,
                    anchor_x, anchor_y,
                )
            elif mode == 'pad':
                img = self._pad_to_ratio(
                    img,
                    int(settings.get('ratio_w') or 16),
                    int(settings.get('ratio_h') or 9),
                    settings.get('output_width') or None,
                    settings.get('output_height') or None,
                    anchor_x, anchor_y,
                )

            img.thumbnail((max_size, max_size), Image.LANCZOS)
            buf = io.BytesIO()
            img.save(buf, 'JPEG', quality=82)
            buf.seek(0)
            return buf

    def delete_batch(self, batch_id):
        """Delete all images in a batch."""
        batch_dir = os.path.join(self.batch_folder, batch_id)
        if os.path.exists(batch_dir):
            shutil.rmtree(batch_dir)

    def get_export_path(self, export_id):
        """Find the ZIP file for a given export_id. Returns (path, filename)."""
        for fname in os.listdir(self.export_folder):
            if fname.startswith(export_id) and fname.endswith('.zip'):
                return os.path.join(self.export_folder, fname), fname
        return None, None
