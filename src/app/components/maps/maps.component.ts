import {
  Component,
  OnInit,
  AfterViewInit,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';

@Component({
  selector: 'app-maps',
  imports: [CommonModule, FormsModule],
  templateUrl: './maps.component.html',
  styleUrl: './maps.component.scss',
})
export class MapsComponent implements OnInit, AfterViewInit {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

  private map!: L.Map;
  private territoryLayer!: L.GeoJSON;
  public searchQuery: string = '';
  public searchResults: any[] = [];
  public selectedTerritory: any = null;

  // Place search properties
  public placeSearchQuery: string = '';
  public placeSearchResults: any[] = [];
  public searchedPlaces: L.Marker[] = [];
  public isSearchingPlaces: boolean = false;
  public territoryWarning: string = '';

  // Sample GeoJSON data for territories (you can replace this with your actual data)
  private territoriesData = {
    type: 'FeatureCollection',
    features: [
      // No predefined territories - territories A, B, C removed
    ],
  };

  ngOnInit(): void {
    // Fix for default markers
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  }

  ngAfterViewInit(): void {
    this.initializeMap();
    this.loadTerritories();
  }

  private initializeMap(): void {
    this.map = L.map(this.mapContainer.nativeElement, {
      center: [40.7128, -73.9559], // New York coordinates
      zoom: 12,
    });

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.map);
  }

  private loadTerritories(): void {
    this.territoryLayer = L.geoJSON(
      this.territoriesData as GeoJSON.FeatureCollection,
      {
        style: (feature) => {
          return {
            fillColor: '#3388ff',
            weight: 2,
            opacity: 1,
            color: '#3388ff',
            dashArray: '3',
            fillOpacity: 0.3,
          };
        },
        onEachFeature: (feature, layer) => {
          // Add popup with territory information
          layer.bindPopup(`
          <div>
            <h3>${feature.properties.name}</h3>
            <p>Population: ${feature.properties.population.toLocaleString()}</p>
            <button onclick="window.selectTerritory('${
              feature.properties.id
            }')">Select Territory</button>
          </div>
        `);

          // Add click event
          layer.on('click', () => {
            this.selectTerritory(feature.properties.id);
          });
        },
      }
    ).addTo(this.map);

    // Fit map to show all territories
    this.map.fitBounds(this.territoryLayer.getBounds());
  }

  public searchTerritories(): void {
    if (!this.searchQuery.trim()) {
      this.searchResults = [];
      return;
    }

    this.searchResults = this.territoriesData.features.filter((feature) =>
      (feature as any).properties?.name
        .toLowerCase()
        .includes(this.searchQuery.toLowerCase())
    );
  }

  public selectTerritory(territoryId: string): void {
    const territory = this.territoriesData.features.find(
      (f: GeoJSON.Feature) => f.properties?.['id'] === territoryId
    );
    if (territory) {
      this.selectedTerritory = territory;

      // Highlight selected territory
      this.territoryLayer.eachLayer((layer: any) => {
        if (layer.feature.properties.id === territoryId) {
          layer.setStyle({
            fillColor: '#ff7800',
            color: '#ff7800',
            fillOpacity: 0.6,
          });
          // Zoom to selected territory
          this.map.fitBounds(layer.getBounds());
        } else {
          layer.setStyle({
            fillColor: '#3388ff',
            color: '#3388ff',
            fillOpacity: 0.3,
          });
        }
      });
    }
  }

  public selectSearchResult(territory: any): void {
    this.selectTerritory(territory.properties.id);
    this.searchQuery = territory.properties.name;
    this.searchResults = [];
  }

  public clearSelection(): void {
    this.selectedTerritory = null;
    this.searchQuery = '';
    this.searchResults = [];
    this.clearPlaceSearch();

    // Reset all territory styles
    this.territoryLayer.eachLayer((layer: any) => {
      layer.setStyle({
        fillColor: '#3388ff',
        color: '#3388ff',
        fillOpacity: 0.3,
      });
    });

    // Fit map to show all territories
    this.map.fitBounds(this.territoryLayer.getBounds());
  }

  // Place search functionality
  public async searchPlaces(): Promise<void> {
    if (!this.placeSearchQuery.trim()) {
      this.placeSearchResults = [];
      return;
    }

    this.isSearchingPlaces = true;
    this.territoryWarning = '';

    try {
      // Using Nominatim (OpenStreetMap) geocoding service
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          this.placeSearchQuery
        )}&limit=5&addressdetails=1`
      );

      if (response.ok) {
        const results = await response.json();
        this.placeSearchResults = results.map((result: any) => ({
          display_name: result.display_name,
          lat: parseFloat(result.lat),
          lon: parseFloat(result.lon),
          place_id: result.place_id,
          type: result.type,
          importance: result.importance,
        }));
      }
    } catch (error) {
      console.error('Error searching places:', error);
      this.placeSearchResults = [];
    } finally {
      this.isSearchingPlaces = false;
    }
  }

  public selectPlace(place: any): void {
    const lat = place.lat;
    const lon = place.lon;

    // Clear previous place markers
    this.clearPlaceMarkers();

    // Add marker for the selected place
    const marker = L.marker([lat, lon]).addTo(this.map).bindPopup(`
        <div>
          <h4>📍 ${place.display_name}</h4>
          <p><strong>Coordinates:</strong> ${lat.toFixed(6)}, ${lon.toFixed(
      6
    )}</p>
        </div>
      `);

    this.searchedPlaces.push(marker);

    // Zoom to the place
    this.map.setView([lat, lon], 15);

    // Check if place is within selected territory
    this.checkPlaceInTerritory(lat, lon, place.display_name);

    // Clear search results
    this.placeSearchResults = [];
    this.placeSearchQuery = place.display_name;
  }

  private checkPlaceInTerritory(
    lat: number,
    lon: number,
    placeName: string
  ): void {
    if (!this.selectedTerritory) {
      this.territoryWarning =
        '⚠️ Please select a territory first to check if this place is within your boundaries.';
      return;
    }

    const point = [lon, lat]; // Note: GeoJSON uses [longitude, latitude]
    const isInside = this.isPointInPolygon(
      point,
      this.selectedTerritory.geometry
    );

    if (isInside) {
      this.territoryWarning = `✅ "${placeName}" is within your selected territory: ${this.selectedTerritory.properties.name}`;
    } else {
      this.territoryWarning = `❌ WARNING: "${placeName}" is NOT within your selected territory (${this.selectedTerritory.properties.name}). This place is outside your jurisdiction.`;
    }
  }

  private isPointInPolygon(point: number[], geometry: any): boolean {
    if (geometry.type === 'Polygon') {
      return this.pointInPolygon(point, geometry.coordinates[0]);
    } else if (geometry.type === 'MultiPolygon') {
      return geometry.coordinates.some((polygon: any) =>
        this.pointInPolygon(point, polygon[0])
      );
    }
    return false;
  }

  private pointInPolygon(point: number[], polygon: number[][]): boolean {
    const [x, y] = point;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];

      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }

    return inside;
  }

  public clearPlaceSearch(): void {
    this.placeSearchQuery = '';
    this.placeSearchResults = [];
    this.territoryWarning = '';
    this.clearPlaceMarkers();
  }

  private clearPlaceMarkers(): void {
    this.searchedPlaces.forEach((marker) => {
      this.map.removeLayer(marker);
    });
    this.searchedPlaces = [];
  }

  public dismissWarning(): void {
    this.territoryWarning = '';
  }
}
