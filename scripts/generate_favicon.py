"""Generate the pixel mark favicon using only Python's standard library."""

from pathlib import Path
import struct
import zlib

PIXELS = [".###.", "#...#", "#...#", "#.#.#", ".####"]
NAVY = (20, 36, 60)
CREAM = (248, 245, 236)
AMBER = (255, 191, 105)


def png_chunk(name: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + name + data + struct.pack(">I", zlib.crc32(name + data))


def make_png(size: int) -> bytes:
    scale = size / 64
    raw = bytearray()
    for y in range(size):
        raw.append(0)
        for x in range(size):
            px, py = (x + 0.5) / scale, (y + 0.5) / scale
            column = int((px - 10) // 9)
            row = int((py - 10) // 9)
            inside = 0 <= row < 5 and 0 <= column < 5 and (px - 10) % 9 < 7 and (py - 10) % 9 < 7
            color = NAVY
            if inside and PIXELS[row][column] == "#":
                color = AMBER if (row, column) in {(3, 2), (4, 3), (4, 4)} else CREAM
            raw.extend((*color, 255))
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + png_chunk(b"IHDR", ihdr) + png_chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + png_chunk(b"IEND", b"")


sizes = (16, 32, 48)
images = [make_png(size) for size in sizes]
offset = 6 + 16 * len(images)
directory = bytearray(struct.pack("<HHH", 0, 1, len(images)))
for size, image in zip(sizes, images):
    directory.extend(struct.pack("<BBBBHHII", size, size, 0, 0, 1, 32, len(image), offset))
    offset += len(image)
Path(__file__).resolve().parents[1].joinpath("public", "favicon.ico").write_bytes(directory + b"".join(images))
