import os
from flask import Blueprint, request, jsonify, send_file
import config
from services.image_batch_service import ImageBatchService, ALLOWED_IMAGE_EXTENSIONS

image_bp = Blueprint('image', __name__)
_svc = ImageBatchService(config.IMAGE_BATCH_FOLDER, config.IMAGE_EXPORT_FOLDER)


def _allowed_image(filename):
    return (
        '.' in filename
        and filename.rsplit('.', 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS
    )


@image_bp.route('/images/batch/create', methods=['POST'])
def create_batch():
    """Create a new image batch and return its ID."""
    try:
        batch_id = _svc.create_batch()
        return jsonify({'batch_id': batch_id}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@image_bp.route('/images/batch/<batch_id>/upload', methods=['POST'])
def upload_images(batch_id):
    """
    Upload one or more images into an existing batch.

    Form field: images (multiple files)
    """
    try:
        files = request.files.getlist('images')
        if not files:
            return jsonify({'error': 'No images provided'}), 400

        results = []
        for f in files:
            if not f.filename or not _allowed_image(f.filename):
                continue
            try:
                info = _svc.save_image(batch_id, f)
                results.append(info)
            except Exception as e:
                results.append({'filename': f.filename, 'error': str(e)})

        return jsonify({'uploaded': results, 'count': len(results)}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@image_bp.route('/images/batch/<batch_id>/image/<image_id>', methods=['GET'])
def get_image(batch_id, image_id):
    """
    Return a single image from a batch.

    Query param: thumbnail=true  →  return the 200px JPEG thumbnail
    """
    try:
        thumbnail = request.args.get('thumbnail', 'false').lower() == 'true'
        path = _svc.get_image_path(batch_id, image_id, thumbnail)
        if not path:
            return jsonify({'error': 'Image not found'}), 404

        ext = path.rsplit('.', 1)[-1].lower()
        mime = {
            'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
            'png': 'image/png',  'gif':  'image/gif',
            'bmp': 'image/bmp',  'webp': 'image/webp',
            'tiff': 'image/tiff', 'tif': 'image/tiff',
        }.get(ext, 'image/jpeg')

        resp = send_file(path, mimetype=mime)
        resp.headers['Cache-Control'] = 'public, max-age=3600'
        return resp
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@image_bp.route('/images/batch/<batch_id>/image/<image_id>/preview', methods=['POST'])
def preview_image(batch_id, image_id):
    """
    Process a single image with the given settings and return a JPEG preview.

    Request body (JSON): same shape as one entry in image_settings,
    plus optional anchor_x / anchor_y (0.0–1.0, default 0.5).
    """
    try:
        settings = request.get_json()
        if not settings:
            return jsonify({'error': 'No request body'}), 400

        buf = _svc.preview_image(batch_id, image_id, settings)
        if buf is None:
            return jsonify({'error': 'Image not found'}), 404

        return send_file(buf, mimetype='image/jpeg')
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@image_bp.route('/images/batch/<batch_id>/process', methods=['POST'])
def process_images(batch_id):
    """
    Process images and return a download URL for the resulting ZIP.

    Request body (JSON):
    {
        "image_settings": [
            {
                "image_id": "...",
                "original_filename": "photo.jpg",
                "mode": "scale" | "crop" | "pad",
                "max_width": 1920,       // scale only
                "max_height": 1080,      // scale only
                "ratio_w": 16,           // crop / pad
                "ratio_h": 9,            // crop / pad
                "output_width": null,    // optional
                "output_height": null    // optional
            },
            ...
        ],
        "format": "jpeg" | "png",
        "quality": 85
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No request body'}), 400

        image_settings = data.get('image_settings', [])
        export_format = data.get('format', 'jpeg').lower()
        quality = data.get('quality', 85)

        if not image_settings:
            return jsonify({'error': 'image_settings is empty'}), 400

        if export_format not in ('png', 'jpeg', 'jpg'):
            return jsonify({'error': 'Invalid format. Use "png" or "jpeg"'}), 400

        result = _svc.process_images(batch_id, image_settings, export_format, quality)

        return jsonify({
            'export_id': result['export_id'],
            'processed_count': result['processed_count'],
            'download_url': f'/api/images/exports/{result["export_id"]}/download',
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@image_bp.route('/images/exports/<export_id>/download', methods=['GET'])
def download_export(export_id):
    """Download the processed-images ZIP file."""
    try:
        zip_path, zip_filename = _svc.get_export_path(export_id)
        if not zip_path or not os.path.exists(zip_path):
            return jsonify({'error': 'Export not found or expired'}), 404

        download_name = (
            zip_filename[len(export_id) + 1:]
            if zip_filename.startswith(export_id)
            else zip_filename
        )

        return send_file(
            zip_path,
            mimetype='application/zip',
            as_attachment=True,
            download_name=download_name,
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@image_bp.route('/images/batch/<batch_id>/convert_to_png', methods=['POST'])
def convert_to_png(batch_id):
    """
    Losslessly convert uploaded images to PNG and return a download URL for the ZIP.

    Request body (JSON):
    {
        "image_info": [
            {"image_id": "...", "original_filename": "photo.webp"},
            ...
        ]
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No request body'}), 400

        image_info = data.get('image_info', [])
        if not image_info:
            return jsonify({'error': 'image_info is empty'}), 400

        result = _svc.convert_to_png(batch_id, image_info)

        return jsonify({
            'export_id': result['export_id'],
            'processed_count': result['processed_count'],
            'download_url': f'/api/images/exports/{result["export_id"]}/download',
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@image_bp.route('/images/batch/<batch_id>', methods=['DELETE'])
def delete_batch(batch_id):
    """Delete all images in a batch."""
    try:
        _svc.delete_batch(batch_id)
        return jsonify({'message': 'Batch deleted'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
