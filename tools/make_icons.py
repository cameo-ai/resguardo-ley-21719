"""Genera los iconos PNG (escudo con check) sin dependencias externas."""
import math, struct, zlib, os

def inside_shield(x, y):
    # coordenadas normalizadas 0..1; escudo simétrico
    if y < 0.08 or y > 0.95: return False
    cx = abs(x - 0.5)
    if y < 0.55:
        return cx <= 0.38
    t = (y - 0.55) / 0.40          # 0..1 hacia la punta
    return cx <= 0.38 * (1 - t ** 1.6)

def dist_seg(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))

def pixel(x, y):
    if not inside_shield(x, y): return (0, 0, 0, 0)
    d = min(dist_seg(x, y, .32, .50, .45, .64), dist_seg(x, y, .45, .64, .70, .36))
    if d < 0.055: return (255, 255, 255, 255)
    k = (y - 0.08) / 0.87
    return (int(29 - 14 * k), int(78 - 36 * k), int(216 - 109 * k), 255)  # azul degradado

def png(size, path):
    ss = 4
    raw = b""
    for j in range(size):
        raw += b"\x00"
        for i in range(size):
            acc = [0, 0, 0, 0]
            for sj in range(ss):
                for si in range(ss):
                    r, g, b, a = pixel((i + (si + .5) / ss) / size, (j + (sj + .5) / ss) / size)
                    acc[0] += r * a; acc[1] += g * a; acc[2] += b * a; acc[3] += a
            a = acc[3]
            if a: raw += bytes([acc[0] // a, acc[1] // a, acc[2] // a, a // (ss * ss)])
            else: raw += b"\x00\x00\x00\x00"
    def chunk(t, d):
        c = struct.pack(">I", len(d)) + t + d
        return c + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    data = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)) \
        + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    open(path, "wb").write(data)

if __name__ == "__main__":
    out = os.path.join(os.path.dirname(__file__), "..", "icons")
    os.makedirs(out, exist_ok=True)
    for s in (16, 32, 48, 128):
        png(s, os.path.join(out, f"icon{s}.png"))
    print("iconos generados")
