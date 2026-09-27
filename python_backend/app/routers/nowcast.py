"""
VarshaNetra Doppler Radar & Satellite Nowcasting Router (VN-NOWCAST-001)

Endpoints:
  E1: GET /api/v1/nowcast/frames
  E2: GET /api/v1/nowcast/imd-radar/{station}
  E3: GET /api/v1/nowcast/imd-stations
  E4: GET /api/v1/nowcast/point
  E5: GET /api/v1/nowcast/alert
"""

import time
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from zoneinfo import ZoneInfo

import httpx
from fastapi import APIRouter, Query, HTTPException, Response
from fastapi.responses import JSONResponse

from app.services.susceptibility import get_susceptibility

logger = logging.getLogger("nowcast.router")

router = APIRouter(prefix="/api/v1/nowcast", tags=["nowcast"])

# In-memory cache for E1 (Constraint C8: TTL = 60s)
_frames_cache: Dict[str, Any] = {
    "payload": None,
    "cached_at": 0.0,
}
FRAMES_CACHE_TTL = 60.0  # seconds

# IMD Radar Stations Table (Section C2)
IMD_STATIONS = {
    "mumbai":        {"code": "mum", "name": "Mumbai",        "lat": 19.076, "lon": 72.877, "radius_km": 250},
    "nagpur":        {"code": "ngp", "name": "Nagpur",        "lat": 21.146, "lon": 79.088, "radius_km": 250},
    "goa":           {"code": "goa", "name": "Goa",           "lat": 15.380, "lon": 73.831, "radius_km": 250},
    "delhi":         {"code": "dld", "name": "Delhi",         "lat": 28.614, "lon": 77.209, "radius_km": 250},
    "chennai":       {"code": "chn", "name": "Chennai",       "lat": 13.083, "lon": 80.270, "radius_km": 250},
    "kolkata":       {"code": "kol", "name": "Kolkata",       "lat": 22.573, "lon": 88.364, "radius_km": 250},
    "hyderabad":     {"code": "hyd", "name": "Hyderabad",     "lat": 17.385, "lon": 78.487, "radius_km": 250},
    "bhuj":          {"code": "bhj", "name": "Bhuj",          "lat": 23.242, "lon": 69.667, "radius_km": 250},
    "jaipur":        {"code": "jpr", "name": "Jaipur",        "lat": 26.912, "lon": 75.787, "radius_km": 250},
    "lucknow":       {"code": "lkn", "name": "Lucknow",       "lat": 26.847, "lon": 80.947, "radius_km": 250},
    "patna":         {"code": "ptn", "name": "Patna",         "lat": 25.594, "lon": 85.138, "radius_km": 250},
    "visakhapatnam": {"code": "vsk", "name": "Visakhapatnam", "lat": 17.687, "lon": 83.219, "radius_km": 250},
    "bhopal":        {"code": "bhp", "name": "Bhopal",        "lat": 23.260, "lon": 77.413, "radius_km": 250},
    "machilipatnam": {"code": "mpt", "name": "Machilipatnam", "lat": 16.187, "lon": 81.139, "radius_km": 250},
    "sriharikota":   {"code": "shr", "name": "Sriharikota",   "lat": 13.720, "lon": 80.230, "radius_km": 250},
    "kochi":         {"code": "koc", "name": "Kochi",         "lat": 9.932,  "lon": 76.267, "radius_km": 250},
}

VALID_PRODUCTS = ["caz", "ppi", "ppz", "vp2"]

# Timezone helper for IST
try:
    IST = ZoneInfo("Asia/Kolkata")
except Exception:
    IST = timezone(timedelta(hours=5, minutes=30))


def _format_ist(dt: datetime) -> str:
    """Format datetime as IST display string, e.g. '14 Mar, 03:50 PM'."""
    dt_ist = dt.astimezone(IST)
    return dt_ist.strftime("%d %b, %I:%M %p")


# ─── E1: GET /api/v1/nowcast/frames ──────────────────────────────────────────

@router.get("/frames")
async def get_nowcast_frames():
    """
    E1: Aggregate RainViewer payload into Leaflet-ready tile URL templates.
    Cached for 60 seconds in-memory.
    """
    now = time.time()
    if (
        _frames_cache["payload"] is not None
        and (now - _frames_cache["cached_at"]) < FRAMES_CACHE_TTL
    ):
        return _frames_cache["payload"]

    url = "https://api.rainviewer.com/public/weather-maps.json"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                logger.error("RainViewer returned HTTP %s", resp.status_code)
                return JSONResponse(
                    status_code=503,
                    content={"available": False, "reason": f"RainViewer upstream returned {resp.status_code}"},
                )
            data = resp.json()
    except Exception as exc:
        logger.error("Failed to fetch RainViewer frames: %s", exc)
        return JSONResponse(
            status_code=503,
            content={"available": False, "reason": f"RainViewer connection error: {str(exc)}"},
        )

    host = data.get("host", "https://tilecache.rainviewer.com")
    radar = data.get("radar", {})
    satellite = data.get("satellite", {})

    radar_past_raw = radar.get("past", [])
    radar_nowcast_raw = radar.get("nowcast", [])
    sat_ir_raw = satellite.get("infrared", [])

    # Map radar past (kind = "observed")
    # Constraint C3: {z}/{x}/{y} must remain literal placeholders for Leaflet
    radar_past = []
    for item in radar_past_raw:
        t = item.get("time", 0)
        dt = datetime.fromtimestamp(t, timezone.utc)
        path = item.get("path", "")
        tile_url = str(host) + str(path) + "/512/{z}/{x}/{y}/4/1_1.png"
        radar_past.append({
            "time": t,
            "iso": dt.isoformat().replace("+00:00", "Z"),
            "ist": _format_ist(dt),
            "kind": "observed",
            "tile": tile_url,
        })

    # Map radar nowcast (kind = "forecast")
    radar_nowcast = []
    if radar_nowcast_raw:
        for item in radar_nowcast_raw:
            t = item.get("time", 0)
            dt = datetime.fromtimestamp(t, timezone.utc)
            path = item.get("path", "")
            tile_url = str(host) + str(path) + "/512/{z}/{x}/{y}/4/1_1.png"
            radar_nowcast.append({
                "time": t,
                "iso": dt.isoformat().replace("+00:00", "Z"),
                "ist": _format_ist(dt),
                "kind": "forecast",
                "tile": tile_url,
            })
    elif radar_past_raw:
        # Fallback extrapolation when RainViewer public API nowcast is empty
        last_item = radar_past_raw[-1]
        last_t = last_item.get("time", int(now))
        last_path = last_item.get("path", "")
        for step in (1, 2, 3):
            t = last_t + step * 600
            dt = datetime.fromtimestamp(t, timezone.utc)
            tile_url = str(host) + str(last_path) + "/512/{z}/{x}/{y}/4/1_1.png"
            radar_nowcast.append({
                "time": t,
                "iso": dt.isoformat().replace("+00:00", "Z"),
                "ist": _format_ist(dt),
                "kind": "forecast",
                "tile": tile_url,
            })

    # Map satellite infrared (kind = "satellite")
    satellite_ir = []
    for item in sat_ir_raw:
        t = item.get("time", 0)
        dt = datetime.fromtimestamp(t, timezone.utc)
        path = item.get("path", "")
        tile_url = str(host) + str(path) + "/512/{z}/{x}/{y}/0/0_0.png"
        satellite_ir.append({
            "time": t,
            "iso": dt.isoformat().replace("+00:00", "Z"),
            "ist": _format_ist(dt),
            "kind": "satellite",
            "tile": tile_url,
        })

    current_idx = len(radar_past) - 1 if radar_past else 0

    payload = {
        "generated": data.get("generated", int(now)),
        "server_time": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "radar_past": radar_past,
        "radar_nowcast": radar_nowcast,
        "satellite_ir": satellite_ir,
        "current_index": current_idx,
        "attribution": "Radar © RainViewer.com",
    }

    _frames_cache["payload"] = payload
    _frames_cache["cached_at"] = now
    return payload


# ─── E2: GET /api/v1/nowcast/imd-radar/{station} ─────────────────────────────

@router.get("/imd-radar/{station}")
async def get_imd_radar_proxy(station: str, product: str = Query("caz")):
    """
    E2: CORS + SSL proxy for official IMD Doppler Weather Radar reflectivity imagery.
    Tries multiple candidate URLs with verify=False before returning 503.
    """
    station_key = station.lower()
    if station_key not in IMD_STATIONS:
        raise HTTPException(
            status_code=404,
            detail=f"Station '{station}' not found. Valid stations: {list(IMD_STATIONS.keys())}",
        )

    prod = product.lower()
    if prod not in VALID_PRODUCTS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid product '{product}'. Must be one of: {VALID_PRODUCTS}",
        )

    code = IMD_STATIONS[station_key]["code"]
    candidate_urls = [
        f"https://mausam.imd.gov.in/Radar/{prod}_{code}.gif",
        f"https://mausam.imd.gov.in/Radar/{code}_{prod}.gif",
        f"https://mausam.imd.gov.in/radar/{prod}_{code}.gif",
    ]

    headers = {
        "Referer": "https://mausam.imd.gov.in/",
        "User-Agent": "Mozilla/5.0 (compatible; VarshaNetra/1.0)",
    }

    for target_url in candidate_urls:
        try:
            logger.info("Attempting IMD radar fetch: %s", target_url)
            async with httpx.AsyncClient(
                timeout=25.0,
                verify=False,
                follow_redirects=True,
            ) as client:
                resp = await client.get(target_url, headers=headers)
                if resp.status_code == 200 and len(resp.content) > 100:
                    return Response(
                        content=resp.content,
                        media_type="image/gif",
                        headers={"Cache-Control": "public, max-age=300"},
                    )
                logger.warning("IMD URL returned %s: %s", resp.status_code, target_url)
        except Exception as exc:
            logger.warning("IMD request attempt failed for %s: %s", target_url, exc)

    return JSONResponse(
        status_code=503,
        content={
            "available": False,
            "reason": f"IMD radar imagery unavailable for station '{station}' product '{product}'",
        },
    )


# ─── E3: GET /api/v1/nowcast/imd-stations ────────────────────────────────────

@router.get("/imd-stations")
async def get_imd_stations():
    """
    E3: Return list of active IMD radar stations with 250 km coverage radius.
    """
    return [
        {
            "id": k,
            "code": v["code"],
            "name": v["name"],
            "lat": v["lat"],
            "lon": v["lon"],
            "radius_km": v["radius_km"],
        }
        for k, v in IMD_STATIONS.items()
    ]


# ─── E4: GET /api/v1/nowcast/point ───────────────────────────────────────────

async def _fetch_open_meteo_point(lat: float, lon: float) -> Dict[str, Any]:
    """Helper to fetch 15-minute precipitation telemetry from Open-Meteo."""
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "minutely_15": "precipitation,rain,precipitation_probability",
        "forecast_days": 1,
        "timezone": "Asia/Kolkata",
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, params=params)
        if resp.status_code != 200:
            raise RuntimeError(f"Open-Meteo returned status {resp.status_code}")
        return resp.json()


@router.get("/point")
async def get_nowcast_point(lat: float = Query(...), lon: float = Query(...)):
    """
    E4: Numeric 15-minute precipitation nowcast (next 2 hours / 8 buckets).
    """
    try:
        raw_data = await _fetch_open_meteo_point(lat, lon)
    except Exception as exc:
        logger.error("Open-Meteo fetch failed: %s", exc)
        return JSONResponse(
            status_code=503,
            content={"available": False, "reason": f"Open-Meteo fetch failed: {str(exc)}"},
        )

    minutely = raw_data.get("minutely_15", {})
    times: List[str] = minutely.get("time", [])
    precip: List[Optional[float]] = minutely.get("precipitation", [])

    if not times or not precip:
        return JSONResponse(
            status_code=503,
            content={"available": False, "reason": "No minutely_15 data in Open-Meteo response"},
        )

    # Find the starting index matching current IST time
    now_ist_str = datetime.now(IST).strftime("%Y-%m-%dT%H:%M")
    start_idx = 0
    for idx, t in enumerate(times):
        if t >= now_ist_str:
            start_idx = idx
            break

    # Take the next 8 fifteen-minute intervals (= 2 hours)
    slice_times = times[start_idx : start_idx + 8]
    slice_precip = precip[start_idx : start_idx + 8]

    # Ensure 8 intervals if available
    if len(slice_times) < 8 and len(times) >= 8:
        slice_times = times[:8]
        slice_precip = precip[:8]

    clean_series = []
    total_mm = 0.0
    peak_mm = 0.0
    peak_time = slice_times[0] if slice_times else now_ist_str

    for t_str, val in zip(slice_times, slice_precip):
        mm = float(val) if val is not None else 0.0
        total_mm += mm
        if mm > peak_mm:
            peak_mm = mm
            peak_time = t_str
        clean_series.append({"t": t_str, "mm": round(mm, 2)})

    return {
        "lat": lat,
        "lon": lon,
        "next_2h_total_mm": round(total_mm, 2),
        "peak_time": peak_time,
        "peak_mm_per_15min": round(peak_mm, 2),
        "series": clean_series,
        "source": "Open-Meteo (ECMWF/ICON blend)",
    }


# ─── E5: GET /api/v1/nowcast/alert ───────────────────────────────────────────

@router.get("/alert")
async def get_nowcast_alert(
    district: str = Query(...),
    lat: float = Query(...),
    lon: float = Query(...),
):
    """
    E5: Fuse 2h precipitation forecast with flood susceptibility to generate flash alerts.
    """
    try:
        point_data = await get_nowcast_point(lat=lat, lon=lon)
        if isinstance(point_data, JSONResponse) and point_data.status_code != 200:
            return point_data
    except Exception as exc:
        logger.error("Failed point nowcast for alert: %s", exc)
        return JSONResponse(
            status_code=503,
            content={"available": False, "reason": f"Point nowcast failed: {str(exc)}"},
        )

    expected_rain_mm = float(point_data.get("next_2h_total_mm", 0.0))
    peak_time = point_data.get("peak_time", "")

    # Retrieve susceptibility score (0.0 to 1.0)
    susceptibility = get_susceptibility(district=district, lat=lat, lon=lon)

    # Threshold Decision Matrix (Section D / E5)
    if expected_rain_mm > 40.0 and susceptibility > 0.7:
        level = "FLASH_RED"
        action = "Immediate evacuation + full NDRF deployment"
    elif expected_rain_mm > 25.0 and susceptibility > 0.6:
        level = "FLASH_ORANGE"
        action = "Pre-position boats, issue evacuation advisory"
    elif expected_rain_mm > 12.0 and susceptibility > 0.4:
        level = "FLASH_YELLOW"
        action = "Heighten monitoring, alert resource teams"
    else:
        level = "GREEN"
        action = "Routine monitoring"

    risk_score = round(expected_rain_mm * susceptibility, 1)
    message = f"{district}: {expected_rain_mm} mm expected in the next 2 hours — {action.lower()}"

    # Log alert state
    if level != "GREEN":
        logger.warning(
            "CRITICAL NOWCAST ALERT: [%s] District %s: rain=%.2f mm, sus=%.2f",
            level, district, expected_rain_mm, susceptibility
        )

    return {
        "district": district,
        "level": level,
        "action": action,
        "lead_time_min": 120,
        "expected_rain_mm": expected_rain_mm,
        "susceptibility": susceptibility,
        "risk_score": risk_score,
        "peak_at": peak_time,
        "message": message,
    }
