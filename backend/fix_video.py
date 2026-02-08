"""
Video Fix Tool
Re-encodes problematic videos to fix ffmpeg compatibility issues
"""
import sys
import os
import subprocess


def fix_video(input_path, output_path=None):
    """
    Re-encode video to fix ffmpeg compatibility issues

    Args:
        input_path: Input video path
        output_path: Output video path (optional)

    Returns:
        str: Path to fixed video
    """
    if not os.path.exists(input_path):
        print(f"Error: File not found: {input_path}")
        return None

    # Generate output path if not provided
    if output_path is None:
        name, ext = os.path.splitext(input_path)
        output_path = f"{name}_fixed{ext}"

    print("=" * 60)
    print("Video Fix Tool")
    print("=" * 60)
    print(f"Input:  {input_path}")
    print(f"Output: {output_path}")
    print()

    # Re-encode with ffmpeg using safer parameters
    # This command:
    # - Re-encodes video with libx264 (widely compatible)
    # - Uses yuv420p pixel format (most compatible)
    # - Copies audio without re-encoding
    # - Uses CRF 18 for high quality
    cmd = [
        'ffmpeg',
        '-i', input_path,
        '-c:v', 'libx264',           # H.264 video codec
        '-preset', 'medium',         # Encoding speed
        '-crf', '18',                # Quality (lower = better, 18 is visually lossless)
        '-pix_fmt', 'yuv420p',       # Pixel format (most compatible)
        '-c:a', 'copy',              # Copy audio stream
        '-y',                        # Overwrite output file
        output_path
    ]

    print("Running ffmpeg to re-encode video...")
    print(f"Command: {' '.join(cmd)}")
    print()

    try:
        # Run ffmpeg
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding='utf-8',
            errors='replace'
        )

        if result.returncode != 0:
            print("Error: ffmpeg failed")
            print("STDERR:", result.stderr)
            return None

        # Check if output file was created
        if os.path.exists(output_path):
            input_size = os.path.getsize(input_path) / (1024 * 1024)
            output_size = os.path.getsize(output_path) / (1024 * 1024)

            print("=" * 60)
            print("Success!")
            print("=" * 60)
            print(f"Original size: {input_size:.2f} MB")
            print(f"Fixed size:    {output_size:.2f} MB")
            print(f"\nFixed video saved to: {output_path}")
            print("\nYou can now use this file with the video splitter.")
            print("=" * 60)

            return output_path
        else:
            print("Error: Output file was not created")
            return None

    except FileNotFoundError:
        print("Error: ffmpeg not found. Please install ffmpeg:")
        print("  - Windows: Download from https://ffmpeg.org/download.html")
        print("  - Or use: winget install ffmpeg")
        return None
    except Exception as e:
        print(f"Error: {str(e)}")
        return None


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python fix_video.py <video_file> [output_file]")
        print()
        print("Example:")
        print("  python fix_video.py video.mp4")
        print("  python fix_video.py video.mp4 video_fixed.mp4")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None

    result = fix_video(input_file, output_file)

    if result:
        sys.exit(0)
    else:
        sys.exit(1)
