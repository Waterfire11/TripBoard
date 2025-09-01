import React, { memo, useState, useMemo, useCallback, useEffect } from 'react';
import Map, { Marker } from 'react-map-gl/mapbox';
import useSupercluster from 'use-supercluster';
import { useGetLocations } from '@/features/boards/hooks';
import { toast } from 'sonner';
import type { BBox } from 'geojson';
import type { ClusterProperties } from 'supercluster';
import type { MapboxEvent } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface BoardMapProps {
  boardId: number;
}

interface PointProperties {
  cluster: boolean;
  locationId: number;
  name: string;
}

const BoardMap: React.FC<BoardMapProps> = memo(({ boardId }) => {
  const { data: locations = [], isLoading, error } = useGetLocations(boardId);
  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  const [viewState, setViewState] = useState({
    latitude: 37.7749,
    longitude: -122.4194,
    zoom: 10,
  });
  const [bounds, setBounds] = useState<BBox | undefined>(undefined);

  const points = useMemo(
    () =>
      locations.map((loc) => ({
        type: 'Feature' as const,
        properties: { cluster: false, locationId: loc.id, name: loc.name },
        geometry: {
          type: 'Point' as const,
          coordinates: [loc.lng, loc.lat],
        },
      })),
    [locations]
  );

  const { clusters, supercluster } = useSupercluster<PointProperties, ClusterProperties>({
    points,
    bounds,
    zoom: viewState.zoom,
    options: { radius: 75, maxZoom: 17 },
  });

  const onMove = useCallback((evt: any) => {
    // The event object includes the updated viewState directly.
    setViewState(evt.viewState);
    const bounds = evt.target.getBounds().toArray();
    setBounds([
      bounds[0][0], // westLng
      bounds[0][1], // southLat
      bounds[1][0], // eastLng
      bounds[1][1] // northLat
    ]);
  }, []);

  const onLoad = useCallback(() => {
    if (locations.length > 0) {
      let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
      locations.forEach((loc) => {
        minLng = Math.min(minLng, loc.lng);
        minLat = Math.min(minLat, loc.lat);
        maxLng = Math.max(maxLng, loc.lng);
        maxLat = Math.max(maxLat, loc.lat);
      });
      setViewState({
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        zoom: 10,
      });
      setBounds([minLng, minLat, maxLng, maxLat]);
    }
  }, [locations]);

  useEffect(() => {
    if (!accessToken) {
      toast.error('Mapbox access token not set.');
    }
  }, [accessToken]);

  useEffect(() => {
    if (error) {
      toast.error(`Error loading locations: ${error.message}`);
    }
  }, [error]);

  if (!accessToken) {
    return <div aria-live="assertive">Error: Mapbox access token not set.</div>;
  }

  if (error) {
    return <div aria-live="assertive">Error loading locations: {error.message}</div>;
  }

  if (isLoading) return <div aria-live="polite">Loading locations...</div>;

  return (
    <Map
      {...viewState}
      onMove={onMove}
      onLoad={onLoad}
      style={{ width: '100%', height: '100%' }}
      mapStyle="mapbox://styles/mapbox/streets-v12"
      mapboxAccessToken={accessToken}
      aria-label="Trip locations map"
    >
      {clusters.map((cluster) => {
        const [longitude, latitude] = cluster.geometry.coordinates;
        const { cluster: isCluster, point_count: pointCount, name, locationId } =
          cluster.properties as PointProperties & ClusterProperties;

        if (isCluster) {
          return (
            <Marker
              key={`cluster-${cluster.id}`}
              latitude={latitude}
              longitude={longitude}
              onClick={() => {
                if (supercluster && cluster.id !== undefined) {
                  const expansionZoom = Math.min(
                    supercluster.getClusterExpansionZoom(Number(cluster.id)),
                    20
                  );
                  setViewState((prev) => ({
                    ...prev,
                    latitude,
                    longitude,
                    zoom: expansionZoom,
                  }));
                }
              }}
            >
              <div
                style={{
                  width: `${30 + (pointCount || 1) * 5}px`,
                  height: `${30 + (pointCount || 1) * 5}px`,
                  borderRadius: '50%',
                  backgroundColor: 'blue',
                  color: 'white',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
                aria-label={`Cluster of ${pointCount || 0} locations`}
              >
                {pointCount}
              </div>
            </Marker>
          );
        }

        return (
          <Marker
            key={`location-${locationId}`}
            latitude={latitude}
            longitude={longitude}
          >
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: 'red',
                cursor: 'pointer',
              }}
              title={name}
              aria-label={`Location: ${name}`}
            />
          </Marker>
        );
      })}
    </Map>
  );
});

export default BoardMap;