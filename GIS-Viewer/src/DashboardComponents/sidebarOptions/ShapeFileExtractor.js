import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, LayersControl, Polyline } from 'react-leaflet';
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";
import ShapeFile from './ShapeFile';
import { TileProviders } from './TileProviders';
import './MyMap.css'

const MyMap = () => {
  const center = [20.5937, 78.9629];  // Central point of Maharashtra
  const zoom = 5;

  const [geodata, setGeodata] = useState(null);
  const [map, setMap] = useState(null);
  const [position, setPosition] = useState(map ? map.getCenter() : { lat: center[0], lng: center[1] });
  const [showMapLayers, setShowMapLayers] = useState(false);  // State to toggle the dropdown visibility
  const [selectedLayers, setSelectedLayers] = useState({
    shrimpLine: false,
    mileLine: false,
    ldhClassification: false,
    gulfwardBoundary: false,
    cultchPlantWaypoints: false,
    aocPermits: false,
    grandIslePark: false,
    usgsQuads: false,
    ldhHarvestGrid: false,
    cultchPlants: false,
    wildlifeAreas: false,
    publicSeedGrounds: false,
    oysterLeaseApps: false,
    oysterLeases: false,
    gulfwardZone: false,
    doubleRigLine: false,
    oslWaterBottoms: false
  });

  const shrimpLineCoordinates = [
    [21.098914, 79.085196],  // Example coordinates (Mumbai)
    [21.098946, 79.085078],  // Another point in Maharashtra
    [21.099051, 79.085110],  // And another point
    [21.099017, 79.085242],
    [21.098914, 79.085196],   // Shrimp line's end point
  ];

  const mileLineCoordinates = [
    [19.0760, 72.8777],  // Mumbai, Maharashtra
    [15.3173, 75.7139],  // Hubli, Karnataka
    [12.9716, 77.5946],  // Bangalore, Karnataka
    [11.0168, 76.9558],  // Coimbatore, Tamil Nadu
  ];

  const ldhClassificationLineCoordinates = [
    [22.5726, 88.3639],  // Kolkata, West Bengal
    [25.5941, 85.1376],  // Patna, Bihar
    [26.8467, 80.9462],  // Lucknow, Uttar Pradesh
    [28.5355, 77.3910],  // Noida, Uttar Pradesh
  ];

  const gulfwardBoundaryLineCoordinates = [
    [18.5204, 73.8567],  // Pune, Maharashtra
    [16.7050, 74.2433],  // Kolhapur, Maharashtra
    [14.5204, 74.8567],  // Random point in Karnataka
    [13.0827, 80.2707],  // Chennai, Tamil Nadu
  ];

  const cultchPlantWaypointsCoordinates = [
    [10.8505, 76.2711],  // Kerala
    [8.5241, 76.9366],   // Thiruvananthapuram, Kerala
    [9.9312, 76.2673],   // Kochi, Kerala
    [15.2993, 74.1240],  // Goa
  ];

  const aocPermitsCoordinates = [
    [22.7196, 75.8577],  // Indore, Madhya Pradesh
    [23.2599, 77.4126],  // Bhopal, Madhya Pradesh
    [24.5854, 73.7125],  // Udaipur, Rajasthan
    [25.4358, 81.8463],  // Prayagraj, Uttar Pradesh
  ];

  const grandIsleParkCoordinates = [
    [34.0837, 74.7973],  // Srinagar, Jammu and Kashmir
    [32.7266, 74.8570],  // Jammu, Jammu and Kashmir
    [31.3260, 75.5762],  // Jalandhar, Punjab
    [30.7046, 76.7179],  // Chandigarh
  ];

  const usgsQuadsCoordinates = [
    [23.8103, 91.4126],  // Agartala, Tripura
    [24.8170, 93.9368],  // Imphal, Manipur
    [27.1767, 78.0081],  // Agra, Uttar Pradesh
    [26.1445, 91.7362],  // Guwahati, Assam
  ];

  const ldhHarvestGridCoordinates = [
    [25.5941, 85.1376],  // Patna, Bihar
    [26.9124, 75.7873],  // Jaipur, Rajasthan
    [28.7041, 77.1025],  // Delhi
    [30.7333, 76.7794],  // Chandigarh
  ];

  const cultchPlantsCoordinates = [
    [17.3850, 78.4867],  // Hyderabad, Telangana
    [15.3173, 75.7139],  // Hubli, Karnataka
    [12.9716, 77.5946],  // Bangalore, Karnataka
    [11.0168, 76.9558],  // Coimbatore, Tamil Nadu
  ];

  const wildlifeAreasCoordinates = [
    [24.5854, 73.7125],  // Udaipur, Rajasthan
    [26.4499, 74.6399],  // Ajmer, Rajasthan
    [23.2599, 77.4126],  // Bhopal, Madhya Pradesh
    [22.7196, 75.8577],  // Indore, Madhya Pradesh
  ];

  const publicSeedGroundsCoordinates = [
    [18.5204, 73.8567],  // Pune, Maharashtra
    [19.0760, 72.8777],  // Mumbai, Maharashtra
    [15.2993, 74.1240],  // Goa
    [12.9716, 77.5946],  // Bangalore, Karnataka
  ];

  const oysterLeaseAppsCoordinates = [
    [27.1767, 78.0081],  // Agra, Uttar Pradesh
    [26.1445, 91.7362],  // Guwahati, Assam
    [23.8103, 91.4126],  // Agartala, Tripura
    [25.5788, 85.1250],  // Patna, Bihar
  ];

  const oysterLeasesCoordinates = [
    [30.7333, 76.7794],  // Chandigarh
    [31.1048, 77.1734],  // Shimla, Himachal Pradesh
    [32.7266, 74.8570],  // Jammu, Jammu and Kashmir
    [34.0837, 74.7973],  // Srinagar, Jammu and Kashmir
  ];

  const gulfwardZoneCoordinates = [
    [11.0168, 76.9558],  // Coimbatore, Tamil Nadu
    [10.8505, 76.2711],  // Kerala
    [9.9312, 76.2673],   // Kochi, Kerala
    [8.5241, 76.9366],   // Thiruvananthapuram, Kerala
  ];

  const doubleRigLineCoordinates = [
    [12.9716, 77.5946],  // Bangalore, Karnataka
    [15.3173, 75.7139],  // Hubli, Karnataka
    [18.5204, 73.8567],  // Pune, Maharashtra
    [19.0760, 72.8777],  // Mumbai, Maharashtra
  ];

  const oslWaterBottomsCoordinates = [
    [22.5726, 88.3639],  // Kolkata, West Bengal
    [23.2599, 77.4126],  // Bhopal, Madhya Pradesh
    [25.5941, 85.1376],  // Patna, Bihar
    [26.9124, 75.7873],  // Jaipur, Rajasthan
  ];

  // Handle layer checkbox changes
  const handleLayerChange = (event) => {
    const { name, checked } = event.target;
    setSelectedLayers(prevState => ({
      ...prevState,
      [name]: checked
    }));
  };

  const DisplayPosition = (props) => {
    const onClick = useCallback(() => {
      props.map.setView(center, zoom)
    }, [props.map]);

    const onMove = useCallback(() => {
      setPosition(props.map.getCenter());
    }, [props.map]);

    useEffect(() => {
      props.map.on('move', onMove);
      return () => {
        props.map.off('move', onMove);
      };
    }, [props.map, onMove]);

    return (
      <div className="lat-long">
        Marker at (lat, lon): ({position.lat.toFixed(4)}, {position.lng.toFixed(4)}{' '})
        <button onClick={onClick}>reset</button>
      </div>
    );
  }

  const handleFile = (e) => {
    var reader = new FileReader();
    var file = e.target.files[0];
    reader.readAsArrayBuffer(file);
    reader.onload = function (buffer) {
      console.log("loading data...", file.name);
      setGeodata({ data: buffer.target.result, name: file.name });
    }
  }

  let ShapeLayers = null;
  if (geodata !== null) {
    const style = { color: "black", weight: 2, fillColor: "transparent", fillOpacity: 0 };  // Define style for ShapeFile layers
    const onEachFeature = (feature, layer) => {  // Define onEachFeature function
      if (feature.properties && feature.properties.name) {
        layer.bindPopup(feature.properties.name);
      }
    };

    ShapeLayers = (
      <LayersControl.Overlay checked name={geodata.name}>
        <ShapeFile
          data={geodata.data}
          style={style}
          onEachFeature={onEachFeature}
        />
      </LayersControl.Overlay>
    );
  }

  const MapLayersDropdown = () => (
    <div className="map-layers-dropdown">
      <div className="map-layers-options">
        <div>
          <label className='map-layer-label'>
            <input
              type="checkbox"
              name="shrimpLine"
              checked={selectedLayers.shrimpLine}
              onChange={handleLayerChange}
            />
            Shrimp Line
          </label>
        </div>
        <div>
          <label className='map-layer-label'>
            <input
              type="checkbox"
              name="mileLine"
              checked={selectedLayers.mileLine}
              onChange={handleLayerChange}
            />
            3-Mile Line
          </label>
        </div>
        <div>
          <label className='map-layer-label'>
            <input
              type="checkbox"
              name="ldhClassification"
              checked={selectedLayers.ldhClassification}
              onChange={handleLayerChange}
            />
            LDH Classification Line
          </label>
        </div>
        <div>
          <label className='map-layer-label'>
            <input
              type="checkbox"
              name="gulfwardBoundary"
              checked={selectedLayers.gulfwardBoundary}
              onChange={handleLayerChange}
            />
            Gulfward Boundary (9-Mile Line)
          </label>
        </div>
        <div>
          <label className='map-layer-label'>
            <input
              type="checkbox"
              name="cultchPlantWaypoints"
              checked={selectedLayers.cultchPlantWaypoints}
              onChange={handleLayerChange}
            />
            Cultch Plant Waypoints
          </label>
        </div>
        <div>
          <label className='map-layer-label'>
            <input
              type="checkbox"
              name="aocPermits"
              checked={selectedLayers.aocPermits}
              onChange={handleLayerChange}
            />
            AOC Permits
          </label>
        </div>
        <div>
          <label className='map-layer-label'>
            <input
              type="checkbox"
              name="grandIslePark"
              checked={selectedLayers.grandIslePark}
              onChange={handleLayerChange}
            />
            Grand Isle Port Commission Oyster Park
          </label>
        </div>
        <div>
          <label className='map-layer-label'>
            <input
              type="checkbox"
              name="usgsQuads"
              checked={selectedLayers.usgsQuads}
              onChange={handleLayerChange}
            />
            USGS Quads 12K
          </label>
        </div>
        <div>
          <label className='map-layer-label'>
            <input
              type="checkbox"
              name="ldhHarvestGrid"
              checked={selectedLayers.ldhHarvestGrid}
              onChange={handleLayerChange}
            />
            LDH Harvest Area Grid
          </label>
        </div>
        <div>
          <label className='map-layer-label'>
            <input
              type="checkbox"
              name="cultchPlants"
              checked={selectedLayers.cultchPlants}
              onChange={handleLayerChange}
            />
            Cultch Plants
          </label>
        </div>
        <div>
          <label className='map-layer-label'>
            <input
              type="checkbox"
              name="wildlifeAreas"
              checked={selectedLayers.wildlifeAreas}
              onChange={handleLayerChange}
            />
            Wildlife Management Areas
          </label>
        </div>
        <div>
          <label className='map-layer-label'>
            <input
              type="checkbox"
              name="publicSeedGrounds"
              checked={selectedLayers.publicSeedGrounds}
              onChange={handleLayerChange}
            />
            Public Seed Grounds
          </label>
        </div>
        <div>
          <label className='map-layer-label'>
            <input
              type="checkbox"
              name="oysterLeaseApps"
              checked={selectedLayers.oysterLeaseApps}
              onChange={handleLayerChange}
            />
            Oyster Lease Applications
          </label>
        </div>
        <div>
          <label className='map-layer-label'>
            <input
              type="checkbox"
              name="oysterLeases"
              checked={selectedLayers.oysterLeases}
              onChange={handleLayerChange}
            />
            Oyster Leases
          </label>
        </div>
        <div>
          <label className='map-layer-label'>
            <input
              type="checkbox"
              name="gulfwardZone"
              checked={selectedLayers.gulfwardZone}
              onChange={handleLayerChange}
            />
            Gulfward Zone
          </label>
        </div>
        <div>
          <label className='map-layer-label'>
            <input
              type="checkbox"
              name="doubleRigLine"
              checked={selectedLayers.doubleRigLine}
              onChange={handleLayerChange}
            />
            Double Rig Line
          </label>
        </div>
        <div>
          <label className='map-layer-label'>
            <input
              type="checkbox"
              name="oslWaterBottoms"
              checked={selectedLayers.oslWaterBottoms}
              onChange={handleLayerChange}
            />
            OSL State Water Bottoms
          </label>
        </div>
      </div>
    </div>
  );

  function MapPlaceholder() {
    return (
      <p>
        Map of Maharashtra.{' '}
        <noscript>You need to enable JavaScript to see this map.</noscript>
      </p>
    )
  }

  return (
    <>
      {map ? <DisplayPosition map={map} position={position} setPosition={setPosition} /> : null}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#f9f9f9', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)', padding: '20px', marginTop: '13vh' }} className="upload-shapefile">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          <label style={{ marginRight: '20px', fontSize: '16px' }}>Upload ShapeFile(.zip):</label>
          <input 
            type="file" 
            accept=".zip" 
            onChange={handleFile} 
            className="inputfile" 
            style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#fff' }} 
          />
          <button
            className="map-layers-button"
            onClick={() => setShowMapLayers(!showMapLayers)}
            style={{ 
              marginLeft: '20px', 
              padding: '10px 20px', 
              border: 'none', 
              borderRadius: '4px', 
              backgroundColor: '#2196f9', 
              color: '#fff', 
              fontSize: '16px', 
              cursor: 'pointer', 
              transition: 'background-color 0.3s ease', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px'
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#2196f9')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#2196f3')}
          >
            Map Layers <span style={{ fontSize: '16px' }}>▼</span>
          </button>
        </div>
      </div>

      {showMapLayers && <MapLayersDropdown />}

      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ width: '100vw', height: "91vh" }}
        whenCreated={setMap}
        placeholder={<MapPlaceholder />}
      >
        {/* Changed position from 'topright' to 'topleft' */}
        <LayersControl position='topleft'>
          {/* Add the Hybrid Map as a base layer option, now set as default (checked) */}
          <LayersControl.BaseLayer checked name="Hybrid Map (Satellite with Labels)">
            <TileLayer 
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" 
              attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
            />
            <TileLayer 
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" 
              attribution="Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom"
            />
          </LayersControl.BaseLayer>

          {/* Keep existing base layers, but changed OpenStreetMap to not be default (checked=false) */}
          {
            Object.keys(TileProviders).flatMap((providerName) => {
              const tileProvider = TileProviders[providerName];
              let tileUrl = tileProvider.url;
              const options = tileProvider.options;
              let apiKey = false;

              if (tileProvider.url && options.attribution && providerName !== 'MtbMap' && !options.bounds && !options.subdomains) {
                if (tileUrl.search('{ext}') > -1) {
                  let ext = options.ext !== '' ? options.ext : 'none';
                  tileUrl = tileUrl.replace("{ext}", ext);
                }
                if (options.id && tileUrl.search('{id}') > -1) {
                  tileUrl = tileUrl.replace("{id}", options.id);
                }
                if (options.subdomains) {
                  tileUrl = tileUrl.replace("{s}", options.subdomains[1]);
                }
                if (tileUrl.search('{apikey}') > -1) {
                  apiKey = options.apikey !== '' ? options.apikey : 'none';
                  tileUrl = tileUrl.replace("{apikey}", apiKey);
                }

                if (tileProvider.variants) {
                  const variants = tileProvider.variants;

                  return Object.keys(variants).map((varName) => {
                    const variant = variants[varName];
                    let varUrl = variant.url ? variant.url : tileUrl;
                    if (varUrl.search('{variant}') > -1) {
                      varUrl = varUrl.replace("{variant}", varName);
                    }

                    // Changed checked to false for OpenStreetMap since hybrid is now default
                    return (
                      <LayersControl.BaseLayer checked={false} key={`${providerName}-${varName}`} name={providerName + " " + varName}>
                        <TileLayer url={varUrl} attribution={options.attribution} />
                      </LayersControl.BaseLayer>
                    );
                  });
                }
              }

              return [];
            })
          }

          {ShapeLayers}

          {/* Draw the Shrimp Line on the map if the checkbox is checked */}
          {selectedLayers.shrimpLine && (
            <Polyline positions={shrimpLineCoordinates} color="blue" weight={2} />
          )}

          {/* Draw the 3-Mile Line on the map if the checkbox is checked */}
          {selectedLayers.mileLine && (
            <Polyline positions={mileLineCoordinates} color="red" weight={2} />
          )}

          {/* Draw the LDH Classification Line on the map if the checkbox is checked */}
          {selectedLayers.ldhClassification && (
            <Polyline positions={ldhClassificationLineCoordinates} color="purple" weight={2} />
          )}

          {/* Draw the Gulfward Boundary on the map if the checkbox is checked */}
          {selectedLayers.gulfwardBoundary && (
            <Polyline positions={gulfwardBoundaryLineCoordinates} color="green" weight={2} />
          )}

          {/* Draw the Cultch Plant Waypoints on the map if the checkbox is checked */}
          {selectedLayers.cultchPlantWaypoints && (
            <Polyline positions={cultchPlantWaypointsCoordinates} color="black" weight={2} />
          )}

          {/* Draw the AOC Permits on the map if the checkbox is checked */}
          {selectedLayers.aocPermits && (
            <Polyline positions={aocPermitsCoordinates} color="brown" weight={2} />
          )}

          {/* Draw the Grand Isle Port Commission Oyster Park on the map if the checkbox is checked */}
          {selectedLayers.grandIslePark && (
            <Polyline positions={grandIsleParkCoordinates} color="pink" weight={2} />
          )}

          {/* Draw the USGS Quads 12K Park on the map if the checkbox is checked */}
          {selectedLayers.usgsQuads && (
            <Polyline positions={usgsQuadsCoordinates} color="orange" weight={2} />
          )}

          {/* Draw the LDH Harvest Area Grid Park on the map if the checkbox is checked */}
          {selectedLayers.ldhHarvestGrid && (
            <Polyline positions={ldhHarvestGridCoordinates} color="yellow" weight={2} />
          )}

          {/* Draw the Cultch Plants Park on the map if the checkbox is checked */}
          {selectedLayers.cultchPlants && (
            <Polyline positions={cultchPlantsCoordinates} color="cyan" weight={2} />
          )}

          {/* Draw the Wildlife Management Areas Park on the map if the checkbox is checked */}
          {selectedLayers.wildlifeAreas && (
            <Polyline positions={wildlifeAreasCoordinates} color="violet" weight={2} />
          )}

          {/* Draw the Public Seed Grounds Park on the map if the checkbox is checked */}
          {selectedLayers.publicSeedGrounds && (
            <Polyline positions={publicSeedGroundsCoordinates} color="lime" weight={2} />
          )}

          {/* Draw the Oyster Lease Applications Park on the map if the checkbox is checked */}
          {selectedLayers.oysterLeaseApps && (
            <Polyline positions={oysterLeaseAppsCoordinates} color="magenta" weight={2} />
          )}

          {/* Draw the Oyster Leases Park on the map if the checkbox is checked */}
          {selectedLayers.oysterLeases && (
            <Polyline positions={oysterLeasesCoordinates} color="navy" weight={2} />
          )}

          {/* Draw the Gulfward Zone Park on the map if the checkbox is checked */}
          {selectedLayers.gulfwardZone && (
            <Polyline positions={gulfwardZoneCoordinates} color="gold" weight={2} />
          )}

          {/* Draw the Double Rig Line Park on the map if the checkbox is checked */}
          {selectedLayers.doubleRigLine && (
            <Polyline positions={doubleRigLineCoordinates} color="crimson" weight={2} />
          )}

          {/* Draw the OSL State Water Bottoms Park on the map if the checkbox is checked */}
          {selectedLayers.oslWaterBottoms && (
            <Polyline positions={oslWaterBottomsCoordinates} color="indigo" weight={2} />
          )}
        </LayersControl>
      </MapContainer>
    </>
  );
}

export default MyMap;
