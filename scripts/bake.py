import json, math, heapq, numpy as np, tifffile
LAT0, LON0 = 6.040, 116.552       # box centre between Park HQ and Low's Peak
HALF = 11000.0                    # m: 22 x 22 km
N = 721                           # ~30.6 m spacing
MLAT = 110574.0; MLON = 111320.0*math.cos(math.radians(LAT0))
def to_xy(lat, lon): return ((lon-LON0)*MLON, (LAT0-lat)*MLAT)   # x east, z south (three.js)
# mosaic the two GLO-30 tiles (pixel-is-area, 1 arcsec, origin 116E, 7N / 6N)
t6 = tifffile.imread('cop_N06_00_E116_00.tif'); t5 = tifffile.imread('cop_N05_00_E116_00.tif')
mos = np.vstack([t6, t5])          # rows from 7N down to 5N
def dem(lat, lon):
    r = (7.0-lat)*3600 - 0.5; c = (lon-116.0)*3600 - 0.5
    r0 = np.floor(r).astype(int); c0 = np.floor(c).astype(int); fr = r-r0; fc = c-c0
    a = mos[r0, c0]; b = mos[r0, c0+1]; cc = mos[r0+1, c0]; d = mos[r0+1, c0+1]
    return (a*(1-fr)*(1-fc) + b*(1-fr)*fc + cc*fr*(1-fc) + d*fr*fc)
xs = np.linspace(-HALF, HALF, N)
X, Z = np.meshgrid(xs, xs)
lat = LAT0 - Z/MLAT; lon = LON0 + X/MLON
H = dem(lat, lon)
Hm = np.round(H).astype('<i2')
Hm.tofile('out/terrain.bin')
meta = dict(n=N, halfSize=HALF, spacing=round(2*HALF/(N-1), 2), origin=[LAT0, LON0], min=int(Hm.min()), max=int(Hm.max()),
  format='int16 little-endian, row-major, row 0 = north edge (z=-halfSize), metres above EGM2008 geoid',
  source='Copernicus GLO-30 DEM (DSM), tiles N05/N06 E116, © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved. Fetched 2026-10-14 from the AWS Open Data copernicus-dem-30m bucket; bilinear resample to a 721x721 grid.')
# ---- OSM ----
els = json.load(open('osm.json'))['elements']
nodes = {e['id']: e for e in els if e['type'] == 'node'}
ways = [e for e in els if e['type'] == 'way' and 'tags' in e]
trailWays = [w for w in ways if w['tags'].get('name') in ('Timpohon Summit Trail', 'Summit Trail', 'Kinabalu Summit Trail')]
G = {}
for w in trailWays:
    for a, b in zip(w['nodes'], w['nodes'][1:]):
        if a in nodes and b in nodes:
            pa = to_xy(nodes[a]['lat'], nodes[a]['lon']); pb = to_xy(nodes[b]['lat'], nodes[b]['lon']); d = math.dist(pa, pb)
            G.setdefault(a, []).append((b, d)); G.setdefault(b, []).append((a, d))
def nearest(lat, lon):
    p = to_xy(lat, lon); return min(G, key=lambda k: math.dist(p, to_xy(nodes[k]['lat'], nodes[k]['lon'])))
START = nearest(6.0297, 116.54707); PEAK = nearest(6.07507, 116.5587)
dist = {START: 0}; prev = {}; pq = [(0, START)]
while pq:
    d, u = heapq.heappop(pq)
    if u == PEAK: break
    if d > dist[u]: continue
    for v, w in G.get(u, []):
        if d+w < dist.get(v, 1e18): dist[v] = d+w; prev[v] = u; heapq.heappush(pq, (d+w, v))
path = [PEAK]
while path[-1] != START: path.append(prev[path[-1]])
path.reverse()
pts = []; cum = 0
for i, nid in enumerate(path):
    n = nodes[nid]; x, z = to_xy(n['lat'], n['lon'])
    if i: cum += math.dist((x, z), (pts[-1][0], pts[-1][1]))
    pts.append([round(x, 1), round(z, 1), round(float(dem(n['lat'], n['lon'])), 1), round(cum, 1)])
def cp(id, nid, osmEle, extra):
    n = nodes[nid]; x, z = to_xy(n['lat'], n['lon'])
    k = min(range(len(pts)), key=lambda i: math.dist((x, z), pts[i][:2]))
    return dict(id=id, osm=nid, lat=n['lat'], lon=n['lon'], x=round(x, 1), z=round(z, 1), along=pts[k][3], snapM=round(math.dist((x, z), pts[k][:2]), 1), osmEle=osmEle, demEle=round(float(dem(n['lat'], n['lon']))), **extra)
CPS = [
  cp('timpohon', 777468372, None, dict(ele=1866, eleSrc='wikipedia')),
  cp('kandis', 5715023522, 1981, {}), cp('ubah', 5715051323, 2081, {}), cp('lowii', 5715051322, 2267, {}),
  cp('mempening', 5715051321, 2516, {}), cp('layang', 5417906421, 2702, {}), cp('vilosa', 5409250021, 2961, {}),
  cp('paka', 5409216622, 3008, {}), cp('labanrata', 4857922323, 3238, dict(ele=3270, eleSrc='wikipedia')),
  cp('sayat', 5417906221, 3668, {}), cp('lowspeak', 777468533, 4095.2, dict(ele=4095, eleSrc='wikipedia')),
]
for c in CPS:
    if 'ele' not in c: c['ele'] = c['osmEle']; c['eleSrc'] = 'osm'
hq = nodes[616607164]; hx, hz = to_xy(hq['lat'], hq['lon'])
extras = [dict(id='parkhq', osm=616607164, lat=hq['lat'], lon=hq['lon'], x=round(hx, 1), z=round(hz, 1), demEle=round(float(dem(hq['lat'], hq['lon']))))]
peaks = [dict(name=nodes[i]['tags']['name'], x=round(to_xy(nodes[i]['lat'], nodes[i]['lon'])[0], 1), z=round(to_xy(nodes[i]['lat'], nodes[i]['lon'])[1], 1), demEle=round(float(dem(nodes[i]['lat'], nodes[i]['lon']))), osm=i)
         for i in (6040932854, 6040932855, 6040932856, 6045567822, 6040932870)]
km = [dict(label=nodes[i]['tags']['name'], along=pts[min(range(len(pts)), key=lambda k: math.dist(to_xy(nodes[i]['lat'], nodes[i]['lon']), pts[k][:2]))][3]) for i in
      (12059292199, 12059292233, 12059292258, 12059292259, 10089329236, 13122904531, 13122904530, 13122904529, 13122904528, 13122904527, 12059292262)]
trail = dict(points=pts, length=round(cum), osmWays=[w['id'] for w in trailWays], startNode=START, peakNode=PEAK,
  source='OpenStreetMap contributors (ODbL), ways Timpohon Summit Trail / Summit Trail / Kinabalu Summit Trail, Overpass pull 2026-10-14; elevations sampled from the GLO-30 DEM')
json.dump(meta, open('out/terrain.json', 'w'), separators=(',', ':'))
json.dump(dict(trail=trail, checkpoints=CPS, places=extras, peaks=peaks, kmMarkers=km), open('out/trail.json', 'w'), separators=(',', ':'))
print('trail', len(pts), round(cum), 'm; dem', meta['min'], meta['max'])
for c in CPS: print(c['id'], c['along'], 'snap', c['snapM'], 'ele', c['ele'], 'dem', c['demEle'])
print(km)
# ---- Borneo inset (Natural Earth 10m land, public domain) ----
land = json.load(open('ne_land_10m.json'))
rings = []
for f in land['features']:
    g = f['geometry']; polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
    for poly in polys:
        r = poly[0]; lons = [p[0] for p in r]; lats = [p[1] for p in r]
        if max(lons) < 108 or min(lons) > 120 or max(lats) < -5 or min(lats) > 8: continue
        if len(r) < 30: continue
        rings.append([[round(p[0], 2), round(p[1], 2)] for p in r[::12]])
json.dump(dict(source='Natural Earth 1:10m land (public domain)', bbox=[108, -4.5, 120, 7.6], rings=rings), open('out/inset.json', 'w'), separators=(',', ':'))
import os; print({f: os.path.getsize('out/'+f) for f in os.listdir('out')})
