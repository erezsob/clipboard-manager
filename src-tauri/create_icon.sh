#!/bin/bash
# Create a minimal 32x32 PNG icon
python3 << 'PYTHON'
try:
    from PIL import Image
    img = Image.new('RGBA', (32, 32), (0, 0, 0, 255))
    img.save('icons/32x32.png')
    print("Icon created")
except ImportError:
    # Fallback: use sips (macOS built-in)
    import subprocess
    subprocess.run(['sips', '-s', 'format', 'png', '--out', 'icons/32x32.png', '/System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/GenericApplicationIcon.icns'], check=False)
    print("Using system icon")
PYTHON
