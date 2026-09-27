import { NextRequest, NextResponse } from "next/server";
import { resolveRadarStationContext } from "@/lib/radar/station-registry";
import { getCanonicalDistrict } from "@/data/supportedDistricts";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const districtQuery = searchParams.get("district") || searchParams.get("districtId") || "pune";
    const latStr = searchParams.get("lat");
    const lonStr = searchParams.get("lon");

    const canonicalDistrict = getCanonicalDistrict(districtQuery);

    const lat = latStr ? parseFloat(latStr) : canonicalDistrict.latitude;
    const lon = lonStr ? parseFloat(lonStr) : canonicalDistrict.longitude;

    const coverageContext = resolveRadarStationContext(
      canonicalDistrict.id,
      lat,
      lon,
      canonicalDistrict.displayNameEn || canonicalDistrict.displayName
    );

    // Standard 4 required radar products (VNET-DWR-RADAR-002)
    const requiredPanels = [
      {
        panelId: "panel_1",
        title: "MAX Reflectivity (Z)",
        titleHi: "अधिकतम परावर्तकता (MAX-Z)",
        productCode: "caz",
        productName: "Composite Max Reflectivity",
        metric: "dBZ",
        purpose: "Peak storm core reflectivity return across vertical volume scan",
        purposeHi: "ऊर्ध्वाधर स्तंभ में उच्चतम रडार परावर्तकता",
        scale: "10 to 65+ dBZ",
      },
      {
        panelId: "panel_2",
        title: "Surface Rainfall Intensity",
        titleHi: "सतही वर्षा तीव्रता (SRI)",
        productCode: "sri",
        productName: "Surface Rainfall Intensity (SRI)",
        metric: "mm/hr",
        purpose: "Estimated real-time precipitation rate reaching surface level",
        purposeHi: "धरातल पर वास्तविक समय वर्षा दर अनुमान",
        scale: "0.5 to 100+ mm/hr",
      },
      {
        panelId: "panel_3",
        title: "Radial Velocity (V)",
        titleHi: "डॉपलर त्रिज्यीय वेग (PPI-V)",
        productCode: "vp2",
        fallbackCode: "ppi",
        productName: "Doppler Radial Velocity (PPI-V)",
        metric: "m/s",
        purpose: "Inbound vs outbound wind vectors for shear & squall line detection",
        purposeHi: "हवा की गति एवं दिशा (अंदर/बाहर)",
        scale: "-32 to +32 m/s",
      },
      {
        panelId: "panel_4",
        title: "Precipitation Accumulation",
        titleHi: "वर्षा संचय (PAC)",
        productCode: "pac",
        fallbackCode: "ppz",
        productName: "Precipitation Accumulation (PAC)",
        metric: "mm",
        purpose: "Radar-derived accumulated rainfall volume over time interval",
        purposeHi: "संचित रडार वर्षा मात्रा",
        scale: "1 to 200+ mm",
      },
    ];

    return NextResponse.json({
      success: true,
      district: {
        id: canonicalDistrict.id,
        name: canonicalDistrict.shortName || canonicalDistrict.displayNameEn,
        nameHi: canonicalDistrict.nameHi,
        latitude: lat,
        longitude: lon,
      },
      coverageContext,
      panels: requiredPanels,
      providerPriority: [
        {
          id: "IMD_OFFICIAL",
          name: "India Meteorological Department (IMD)",
          role: "PRIMARY_OFFICIAL_PROVIDER",
          network: "National Doppler Weather Radar Network",
          status: "ACTIVE",
          attribution: "Radar Data © India Meteorological Department (IMD), Ministry of Earth Sciences",
        },
        {
          id: "RAINVIEWER_FALLBACK",
          name: "RainViewer Open Radar API",
          role: "SECONDARY_COMPOSITE_FALLBACK",
          status: "AVAILABLE",
          attribution: "Radar composite © RainViewer.com",
        },
      ],
      scanCadence: "10-15 Minutes",
      lastSynchronized: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error resolving radar station context";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
