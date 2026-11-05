"""Lädt alle Layer der Angelkarte (ArcGIS WebMap) und baut daraus statische Dateien
für die schnelle App: data/points.geojson, lines.geojson, polygons.geojson,
data/layers.json (Ebenen, Gruppen, Maßstäbe), data/styles.json und data/icons/*.png.
Läuft in GitHub Actions (siehe .github/workflows/build-data.yml)."""
import json, os, math, base64, hashlib, re, urllib.request, urllib.parse
from concurrent.futures import ThreadPoolExecutor

WEBMAP = "24533f5e5b154ba5bd5d03fa473abd86"
OUT = "data"
os.makedirs(f"{OUT}/icons", exist_ok=True)

def q(url):  # Umlaute in URLs sicher kodieren
    p = urllib.parse.urlsplit(url)
    return urllib.parse.urlunsplit((p.scheme, p.netloc, urllib.parse.quote(p.path), p.query, ""))

def get(url):
    for i in range(3):
        try:
            with urllib.request.urlopen(q(url), timeout=120) as r:
                return json.load(r)
        except Exception as e:
            err = e
    raise err

def zoom(scale):  # ArcGIS-Maßstab -> Web-Mercator-Zoom
    return round(math.log2(591657527.591555 / scale), 2) if scale else None


# --- Geometrie verkleinern: Douglas-Peucker + 5 Nachkommastellen (~1 m) ---
TOL = 0.000012
def _rdp(pts, tol):
    if len(pts) < 3: return pts
    keep = [False] * len(pts); keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        ax, ay = pts[a]; bx, by = pts[b]; dx, dy = bx - ax, by - ay; L = dx * dx + dy * dy
        best, bi = 0, -1
        for i in range(a + 1, b):
            px, py = pts[i]
            if L == 0: d = (px - ax) ** 2 + (py - ay) ** 2
            else:
                t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / L))
                d = (px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2
            if d > best: best, bi = d, i
        if best > tol * tol:
            keep[bi] = True; stack += [(a, bi), (bi, b)]
    return [p for p, k in zip(pts, keep) if k]
def _r(pt): return [round(pt[0], 5), round(pt[1], 5)]
def simplify(g):
    t, c = g["type"], g["coordinates"]
    if t == "LineString": c = [_r(p) for p in _rdp(c, TOL)]
    elif t == "MultiLineString": c = [[_r(p) for p in _rdp(l, TOL)] for l in c]
    elif t == "Polygon": c = [r for r in ([_r(p) for p in _rdp(r, TOL)] for r in c) if len(r) >= 4]
    elif t == "MultiPolygon": c = [[r for r in ([_r(p) for p in _rdp(r, TOL)] for r in poly) if len(r) >= 4] for poly in c]
    else: return g
    return {"type": t, "coordinates": c}

def _inside(x, y, ring):
    ins = False; j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]; xj, yj = ring[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi + 1e-30) + xi: ins = not ins
        j = i
    return ins
def label_point(g):
    """Punkt im Inneren des größten Polygons, möglichst weit vom Rand (für Beschriftungen)."""
    polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
    def area(r): return abs(sum(r[i][0] * r[i - 1][1] - r[i - 1][0] * r[i][1] for i in range(len(r)))) / 2
    poly = max(polys, key=lambda p: area(p[0]) if p and p[0] else 0)
    ring = poly[0]
    xs = [p[0] for p in ring]; ys = [p[1] for p in ring]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    segs = [(r[i - 1], r[i]) for r in poly for i in range(1, len(r))]
    def dist(x, y):
        m = 1e9
        for (ax, ay), (bx, by) in segs[::max(1, len(segs) // 400)]:
            dx, dy = bx - ax, by - ay; L = dx * dx + dy * dy
            t = 0 if L == 0 else max(0, min(1, ((x - ax) * dx + (y - ay) * dy) / L))
            m = min(m, (x - ax - t * dx) ** 2 + (y - ay - t * dy) ** 2)
        return m
    best, bp, N = -1, [(x0 + x1) / 2, (y0 + y1) / 2], 24
    for i in range(N):
        for j in range(N):
            x = x0 + (x1 - x0) * (i + .5) / N; y = y0 + (y1 - y0) * (j + .5) / N
            if _inside(x, y, ring) and not any(_inside(x, y, h) for h in poly[1:]):
                d = dist(x, y)
                if d > best: best, bp = d, [x, y]
    return {"type": "Point", "coordinates": _r(bp)}

DROP = {"OBJECTID", "FID", "GlobalID", "GlobalID_2", "Shape__Area", "Shape__Length", "Shape_Area", "Shape_Length",
        "CreationDate", "Creator", "EditDate", "Editor", "geom", "MinFot", "MinBil", "Umfang_km",
        "MAJ_CAT", "MIN_CAT", "L_LIMIT", "U_LIMIT", "ZORDER", "LAYER", "MODE", "COLOR", "WIDTH", "VALUE", "Id", "ID"}

wm = get(f"https://www.arcgis.com/sharing/rest/content/items/{WEBMAP}/data?f=json")

def flat(ls):
    for l in ls:
        if l.get("layers"): yield from flat(l["layers"])
        elif l.get("url"): yield l
wlayers = list(flat(wm["operationalLayers"]))

def group(title, url, geom, fields, poly_has_fill):
    n = (title + " " + url.split("/services/")[1]).lower()
    if "legende" in n: return None
    if "boang" in n: return "boot"
    if "tiefen" in n: return "tiefen"
    if "gewässernamen" in n: return "namen"
    if "angg" in n: return "shops"
    if geom == "esriGeometryPoint":
        if "Fototyp" in fields or "Fotoart" in fields or "WSFoto" in url: return "fotos"
        if "avb" in n: return "verbot"
        if "azi" in n or "AZI" in fields: return "infra"
        return "fotos"
    if geom == "esriGeometryPolyline": return "bereiche"
    if geom == "esriGeometryPolygon":
        return "gewaesser" if poly_has_fill else "namen"
    return None

def rgba(c):
    if not c: return None
    r, g, b, a = (list(c) + [255])[:4]
    return f"rgba({r},{g},{b},{round(a/255, 3)})"

styles, style_idx, icons = [], {}, {}
def style_of(sym, opacity):
    if not sym: return None
    t = sym.get("type"); s = None
    if t == "esriSLS":
        if sym.get("style") == "esriSLSNull": return None
        s = {"t": "line", "c": rgba(sym.get("color")), "w": round((sym.get("width") or 1) * 1.333, 2),
             "d": sym.get("style") not in (None, "esriSLSSolid")}
    elif t == "esriSFS":
        o = sym.get("outline") or {}
        oc = rgba(o.get("color")) if o.get("style") != "esriSLSNull" else None
        fc = rgba(sym.get("color")) if sym.get("style") != "esriSFSNull" else None
        if not fc and not oc: return None
        s = {"t": "fill", "c": fc, "oc": oc, "ow": round((o.get("width") or 1) * 1.333, 2)}
    elif t == "esriSMS":
        o = sym.get("outline") or {}
        s = {"t": "circle", "c": rgba(sym.get("color")), "r": round((sym.get("size") or 6) * 1.333 / 2, 2),
             "oc": rgba(o.get("color")), "ow": round((o.get("width") or 0) * 1.333, 2)}
    elif t == "esriPMS" and sym.get("imageData"):
        h = hashlib.md5(sym["imageData"].encode()).hexdigest()[:10]
        if h not in icons:
            icons[h] = True
            open(f"{OUT}/icons/{h}.png", "wb").write(base64.b64decode(sym["imageData"]))
        s = {"t": "icon", "i": h, "sz": round((sym.get("width") or 15) * 1.333, 1)}
    if not s: return None
    s["op"] = opacity
    k = json.dumps(s, sort_keys=True)
    if k not in style_idx:
        style_idx[k] = len(styles); styles.append(s)
    return style_idx[k]

def fetch_all(url):
    feats, off = [], 0
    while True:
        r = get(f"{url}/query?where=1%3D1&outFields=*&outSR=4326&geometryPrecision=6"
                f"&resultOffset={off}&resultRecordCount=1000&f=geojson")
        fs = r.get("features", [])
        feats += fs; off += len(fs)
        if not fs or not (r.get("properties") or {}).get("exceededTransferLimit"): break
    return feats

def load(i_l):
    i, l = i_l
    meta = get(l["url"] + "?f=json")
    feats = fetch_all(l["url"]) if "error" not in meta else []
    return i, l, meta, feats

with ThreadPoolExecutor(8) as ex:
    results = sorted(ex.map(load, enumerate(wlayers)), key=lambda x: x[0])

out = {"Point": [], "Line": [], "Polygon": []}
layers = []
for i, l, meta, feats in results:
    if "error" in meta: print("FEHLER", l["title"], meta["error"]); continue
    ld = l.get("layerDefinition") or {}
    di = ld.get("drawingInfo") or meta.get("drawingInfo") or {}
    r = di.get("renderer") or {}
    fields = [f["name"] for f in meta.get("fields", [])]
    geom = meta.get("geometryType")
    op = l.get("opacity", 1) * (1 - (di.get("transparency") or 0) / 100)
    syms = [r.get("symbol")] + [u.get("symbol") for u in r.get("uniqueValueInfos") or []]
    has_fill = any(s and s.get("type") == "esriSFS" and s.get("color") and s.get("style") != "esriSFSNull" for s in syms)
    g = group(l["title"], l["url"], geom, fields, has_fill)
    if g is None: continue
    # Beschriftung
    lab = None
    li = (ld.get("drawingInfo") or {}).get("labelingInfo") or di.get("labelingInfo")
    if li and l.get("showLabels", True):
        m = re.search(r'\$feature\["([^"]+)"\]|\[([^\]]+)\]', (li[0].get("labelExpressionInfo") or {}).get("expression") or li[0].get("labelExpression") or "")
        if m:
            sym = li[0].get("symbol") or {}
            lab = {"f": m.group(1) or m.group(2), "minz": zoom(li[0].get("minScale")), "maxz": zoom(li[0].get("maxScale")),
                   "c": rgba(sym.get("color")) or "#333", "h": rgba((sym.get("haloColor"))), "sz": round(((sym.get("font") or {}).get("size") or 9) * 1.333, 1)}
    # Maßstabsbereich
    minS = l.get("minScale", ld.get("minScale", meta.get("minScale"))) or 0
    maxS = l.get("maxScale", ld.get("maxScale", meta.get("maxScale"))) or 0
    rec = {"id": len(layers), "title": l["title"], "url": l["url"], "group": g, "geom": geom,
           "minz": zoom(minS), "maxz": zoom(maxS), "visible": l.get("visibility", True),
           "att": bool(meta.get("hasAttachments")), "label": lab,
           "popup": bool(l.get("popupInfo")) and not l.get("disablePopup"),
           "popupFields": [ (f["fieldName"], f.get("label")) for f in (l.get("popupInfo") or {}).get("fieldInfos", []) if f.get("visible")],
           "popupTitle": (l.get("popupInfo") or {}).get("title"), "n": 0}
    f1, f2, f3, dl = r.get("field1"), r.get("field2"), r.get("field3"), r.get("fieldDelimiter", ",")
    uv = {str(u.get("value")): u.get("symbol") for u in r.get("uniqueValueInfos") or []}
    labels = {str(u.get("value")): u.get("label") for u in r.get("uniqueValueInfos") or []}
    kind = {"esriGeometryPoint": "Point", "esriGeometryMultipoint": "Point", "esriGeometryPolyline": "Line", "esriGeometryPolygon": "Polygon"}.get(geom)
    if not kind: continue
    for f in feats:
        if not f.get("geometry"): continue
        p = f.get("properties") or {}
        if r.get("type") == "uniqueValue":
            key = dl.join(str(p.get(x)) for x in (f1, f2, f3) if x)
            sym = uv.get(key, r.get("defaultSymbol"))
            cat = labels.get(key, "")
        else:
            sym, cat = r.get("symbol"), ""
        s = style_of(sym, round(op, 3)) if op > 0 else None
        if s is None and not (lab and p.get(lab["f"])): continue
        props = {"_l": rec["id"], "_o": f.get("id", p.get("OBJECTID") or p.get("FID"))}
        gk = kind
        geo = simplify(f["geometry"]) if kind != "Point" else f["geometry"]
        if kind == "Polygon" and s is None:   # nur Beschriftung -> Punkt statt Fläche
            geo, gk = label_point(geo), "Point"
            rec.setdefault("labelPoints", True)
        if s is not None: props["_s"] = s
        if cat: props["_k"] = cat.strip()
        if lab and p.get(lab["f"]): props["_n"] = str(p[lab["f"]]).strip()
        for k, v in p.items():
            if v in (None, "", " ") or k in DROP or k.startswith("Bearb_"): continue
            props[k] = v
        out[gk].append({"type": "Feature", "geometry": geo, "properties": props})
        rec["n"] += 1
    if rec["n"]: layers.append(rec)

for kind, fs in out.items():
    with open(f"{OUT}/{kind.lower()}s.geojson", "w") as fh:
        json.dump({"type": "FeatureCollection", "features": fs}, fh, ensure_ascii=False, separators=(",", ":"))
json.dump({"layers": layers, "styles": styles, "basemap": wm.get("baseMap"),
           "built": __import__("datetime").datetime.utcnow().isoformat() + "Z"},
          open(f"{OUT}/meta.json", "w"), ensure_ascii=False, indent=0)
print({k: len(v) for k, v in out.items()}, len(layers), "layers", len(styles), "styles", len(icons), "icons")
for f in sorted(os.listdir(OUT)):
    if f.endswith((".geojson", ".json")): print(f, os.path.getsize(f"{OUT}/{f}"))
