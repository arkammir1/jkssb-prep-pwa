"""
Generate standard PNG icons for PWA manifest without external dependencies using zlib and struct.
"""
import zlib
import struct
import os

def create_png(width, height, r, g, b, output_path):
    # PNG signature
    png = b'\x89PNG\r\n\x1a\n'
    
    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    ihdr_crc = zlib.crc32(b'IHDR' + ihdr_data)
    png += struct.pack('>I', 13) + b'IHDR' + ihdr_data + struct.pack('>I', ihdr_crc)
    
    # IDAT chunk (simple colored icon with border and center shield pattern)
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0) # filter type none
        for x in range(width):
            # Gradient navy to dark blue
            dist_center = ((x - width/2)**2 + (y - height/2)**2)**0.5
            if dist_center < width * 0.42:
                # Golden / navy crest
                if dist_center < width * 0.15:
                    raw_data.extend((56, 189, 248)) # cyan highlight
                elif dist_center < width * 0.35 and (x + y) % 4 == 0:
                    raw_data.extend((251, 191, 36)) # gold crest
                else:
                    raw_data.extend((30, 58, 138)) # deep navy
            else:
                raw_data.extend((15, 23, 42)) # dark slate border
                
    compressed = zlib.compress(bytes(raw_data))
    idat_crc = zlib.crc32(b'IDAT' + compressed)
    png += struct.pack('>I', len(compressed)) + b'IDAT' + compressed + struct.pack('>I', idat_crc)
    
    # IEND chunk
    iend_crc = zlib.crc32(b'IEND')
    png += struct.pack('>I', 0) + b'IEND' + struct.pack('>I', iend_crc)
    
    with open(output_path, 'wb') as f:
        f.write(png)
    print(f"Generated PNG: {output_path}")

base = r'C:\Users\user\.gemini\antigravity\scratch\jkssb-prep-pwa\icons'
create_png(192, 192, 30, 58, 138, os.path.join(base, 'icon-192.png'))
create_png(512, 512, 30, 58, 138, os.path.join(base, 'icon-512.png'))
