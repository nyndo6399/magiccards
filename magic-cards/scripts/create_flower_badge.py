import subprocess
import collections

cmd = 'convert public/assets/aistudio/Flower_function_button_with_one_a63d248d_2K_38a25f4e.jpg -crop 1280x1280+737+156 +repage -resize 512x512 ppm:-'
ppm = subprocess.check_output(cmd, shell=True)
lines = ppm.split(b'\n', 3)
dims = lines[1].split()
w, h = int(dims[0]), int(dims[1])
raw_rgb = lines[3]

grid = []
idx = 0
for y in range(h):
    row = []
    for x in range(w):
        r = raw_rgb[idx]
        g = raw_rgb[idx+1]
        b = raw_rgb[idx+2]
        idx += 3
        row.append((r, g, b))
    grid.append(row)

# Flood fill from outside borders
is_bg = [[False] * w for _ in range(h)]
queue = collections.deque()

def is_background_color(r, g, b):
    # Any blue tint or outside sparkles
    if b > r + 8 and b > 110:
        return True
    if b > 160 and r < 220 and g > 160:
        return True
    if r > 225 and g > 225 and b > 225:
        return True
    return False

for x in range(w):
    for y in [0, 1, 2, 3, 4, h-5, h-4, h-3, h-2, h-1]:
        r, g, b = grid[y][x]
        if is_background_color(r, g, b) and not is_bg[y][x]:
            is_bg[y][x] = True
            queue.append((x, y))

for y in range(h):
    for x in [0, 1, 2, 3, 4, w-5, w-4, w-3, w-2, w-1]:
        r, g, b = grid[y][x]
        if is_background_color(r, g, b) and not is_bg[y][x]:
            is_bg[y][x] = True
            queue.append((x, y))

while queue:
    cx, cy = queue.popleft()
    for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        nx, ny = cx + dx, cy + dy
        if 0 <= nx < w and 0 <= ny < h and not is_bg[ny][nx]:
            nr, ng, nb = grid[ny][nx]
            if is_background_color(nr, ng, nb):
                is_bg[ny][nx] = True
                queue.append((nx, ny))

# Also clean any isolated specks outside the flower
for y in range(h):
    for x in range(w):
        d = ((x - 265)**2 + (y - 275)**2)**0.5
        if d > 230 and not is_bg[y][x]:
            r, g, b = grid[y][x]
            if (r > 190 and g > 190 and b > 190) or (b > r):
                is_bg[y][x] = True

rgba_base = bytearray()
center_x = 267
center_y = 277
inner_radius = 108

for y in range(h):
    for x in range(w):
        r, g, b = grid[y][x]
        if is_bg[y][x]:
            rgba_base.extend([0, 0, 0, 0])
        else:
            has_bg_neighbor = False
            for dy in [-1, 0, 1]:
                for dx in [-1, 0, 1]:
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and is_bg[ny][nx]:
                        has_bg_neighbor = True
                        break
            
            a = 150 if has_bg_neighbor and (b > r) else 255

            dx = x - center_x
            dy = y - center_y
            dist = (dx*dx + dy*dy) ** 0.5

            if dist < inner_radius:
                v = (y - (center_y - inner_radius)) / (2.0 * inner_radius)
                gr = int(252 - v * 16)
                gg = int(188 - v * 32)
                gb = int(48 - v * 18)

                shine_dist = ((x - (center_x - 38))**2 + (y - (center_y - 42))**2) ** 0.5
                if shine_dist < 40:
                    factor = 1.0 - (shine_dist / 40.0)
                    gr = min(255, int(gr + 20 * factor))
                    gg = min(255, int(gg + 25 * factor))
                    gb = min(255, int(gb + 25 * factor))

                rgba_base.extend([gr, gg, gb, a])
            else:
                rgba_base.extend([r, g, b, a])

with open('/tmp/flower_base.rgba', 'wb') as f:
    f.write(rgba_base)

subprocess.check_call('convert -size 512x512 -depth 8 rgba:/tmp/flower_base.rgba public/flower_badge_base.png', shell=True)
print('Flower badge base 100% clean!')
