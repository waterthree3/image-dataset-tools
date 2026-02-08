"""
Video Debug Script
Diagnoses video file and OpenCV configuration issues
"""
import cv2
import sys
import os
import numpy as np


def test_video_file(video_path):
    """Test if video file can be read correctly"""

    print("=" * 60)
    print("Video File Debug Tool")
    print("=" * 60)
    print(f"\nTest file: {video_path}")

    # Check file exists
    if not os.path.exists(video_path):
        print(f"❌ Error: File not found")
        return False

    file_size = os.path.getsize(video_path) / (1024 * 1024)  # MB
    print(f"✓ File size: {file_size:.2f} MB")

    # Test different backends
    backends = [
        (cv2.CAP_FFMPEG, "FFMPEG"),
        (cv2.CAP_ANY, "Default Backend"),
    ]

    for backend, backend_name in backends:
        print(f"\n--- Testing {backend_name} ---")

        cap = cv2.VideoCapture(video_path, backend)
        if not cap.isOpened():
            print(f"❌ Cannot open video file")
            continue

        try:
            # Get video properties
            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fourcc = int(cap.get(cv2.CAP_PROP_FOURCC))

            # Convert fourcc to string
            fourcc_str = "".join([chr((fourcc >> 8 * i) & 0xFF) for i in range(4)])

            print(f"✓ Video info:")
            print(f"  - Resolution: {width} x {height}")
            print(f"  - Frame rate: {fps:.2f} fps")
            print(f"  - Total frames: {frame_count}")
            print(f"  - Codec: {fourcc_str}")

            # Try reading first few frames
            print(f"\nTesting first 5 frames:")
            success_count = 0
            black_count = 0

            for i in range(5):
                ret, frame = cap.read()

                if not ret or frame is None:
                    print(f"  Frame {i}: ❌ Read failed")
                    continue

                # Check frame properties
                frame_mean = frame.mean()
                frame_std = frame.std()
                frame_shape = frame.shape

                is_black = frame_mean < 1.0

                status = "⚠️ Black" if is_black else "✓ Normal"
                print(f"  Frame {i}: {status} (shape={frame_shape}, mean={frame_mean:.2f}, std={frame_std:.2f})")

                if ret:
                    success_count += 1
                if is_black:
                    black_count += 1

                # Save first frame for inspection
                if i == 0:
                    test_output = "test_frame_0.jpg"
                    cv2.imwrite(test_output, frame)
                    print(f"  → First frame saved to: {test_output}")

            print(f"\nResult: {success_count}/5 frames read successfully")
            if black_count > 0:
                print(f"⚠️ WARNING: {black_count}/5 frames are black")
                if black_count == success_count:
                    print("\n" + "=" * 60)
                    print("DIAGNOSTIC INFORMATION")
                    print("=" * 60)
                    print("All frames appear to be black. This usually indicates:")
                    print("  1. Video encoding issues (codec parameters problem)")
                    print("  2. Corrupted video metadata")
                    print("  3. FFmpeg swscaler compatibility issues")
                    print()
                    print("RECOMMENDED SOLUTION:")
                    print("  Run the video fix tool to re-encode the video:")
                    print("  > python fix_video.py <video_path>")
                    print()
                    print("  Or use the batch file:")
                    print("  > fix_video.bat")
                    print("=" * 60)

            # Try reading middle frame
            if frame_count > 10:
                print(f"\nTesting middle frame (frame index {frame_count // 2}):")
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_count // 2)
                ret, frame = cap.read()

                if ret and frame is not None:
                    frame_mean = frame.mean()
                    is_black = frame_mean < 1.0
                    status = "⚠️ Black" if is_black else "✓ Normal"
                    print(f"  Middle frame: {status} (mean={frame_mean:.2f})")

                    test_output = f"test_frame_middle.jpg"
                    cv2.imwrite(test_output, frame)
                    print(f"  → Middle frame saved to: {test_output}")
                else:
                    print(f"  ❌ Cannot read middle frame")

            print(f"\n✓ {backend_name} test complete")
            return True

        except Exception as e:
            print(f"❌ Error: {str(e)}")
            return False
        finally:
            cap.release()

    return False


def print_opencv_info():
    """Print OpenCV configuration info"""
    print("\n" + "=" * 60)
    print("OpenCV Configuration")
    print("=" * 60)
    print(f"OpenCV version: {cv2.__version__}")
    print(f"Build info:")
    print(cv2.getBuildInformation())


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python debug_video.py <video_file_path>")
        print("\nExample:")
        print("  python debug_video.py storage/uploads/test.mp4")
        sys.exit(1)

    video_path = sys.argv[1]

    # Test video file
    result = test_video_file(video_path)

    # Print OpenCV info (optional)
    if "--verbose" in sys.argv:
        print_opencv_info()

    print("\n" + "=" * 60)
    if result:
        print("✓ Test complete, please check the generated test images")
    else:
        print("❌ Test failed")
    print("=" * 60)
