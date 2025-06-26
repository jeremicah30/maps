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
  selector: 'app-stepper',
  imports: [CommonModule, FormsModule],
  templateUrl: './stepper.component.html',
  styleUrl: './stepper.component.scss',
})
export class StepperComponent implements OnInit, AfterViewInit {
  getDrawingPoints() {
    throw new Error('Method not implemented.');
  }
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

  // Component state - no longer needed for single panel

  // Map and territory data
  private map!: L.Map;
  private territoryLayer!: L.GeoJSON;
  public selectedTerritory: any = null;

  // Step 1: Custom territory creation
  public isDrawingMode: boolean = false;
  public customTerritory: any = null;
  private drawingLayer: L.LayerGroup = new L.LayerGroup();
  private currentDrawing: L.Polygon | null = null;
  public drawingPoints: L.LatLng[] = [];

  // Step 2: Place search
  public placeSearchQuery: string = '';
  public placeSearchResults: any[] = [];
  public searchedPlaces: L.Marker[] = [];
  public isSearchingPlaces: boolean = false;
  public territoryValidationResult: string = '';
  public validationStatus: 'success' | 'error' | 'info' | null = null;

  // Sample GeoJSON data for territories - territories A, B, C removed
  private territoriesData = {
    type: 'FeatureCollection',
    features: [
      // No predefined territories - users can create custom territories
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
      center: [40.7128, -73.9559],
      zoom: 12,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.map);

    // Add drawing layer
    this.drawingLayer.addTo(this.map);

    // Add map click handler for drawing
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      if (this.isDrawingMode) {
        this.addDrawingPoint(e.latlng);
      }
    });
  }

  private loadTerritories(): void {
    this.territoryLayer = L.geoJSON(
      this.territoriesData as GeoJSON.FeatureCollection,
      {
        style: (feature) => {
          return {
            fillColor:
              this.selectedTerritory?.properties.id === feature?.properties.id
                ? '#ff7800'
                : '#3388ff',
            weight: 2,
            opacity: 1,
            color:
              this.selectedTerritory?.properties.id === feature?.properties.id
                ? '#ff7800'
                : '#3388ff',
            dashArray: '3',
            fillOpacity:
              this.selectedTerritory?.properties.id === feature?.properties.id
                ? 0.6
                : 0.3,
          };
        },
        onEachFeature: (feature, layer) => {
          layer.bindPopup(`
          <div>
            <h3>${feature.properties.name}</h3>
            <p>Population: ${feature.properties.population.toLocaleString()}</p>
            <p><strong>Click to select this territory</strong></p>
          </div>
        `);

          layer.on('click', () => {
            this.selectTerritory(feature.properties.id);
          });
        },
      }
    ).addTo(this.map);

    this.map.fitBounds(this.territoryLayer.getBounds());
  }

  // Navigation methods removed - using side-by-side layout

  // Step 1: Custom territory creation methods
  public startDrawing(): void {
    this.isDrawingMode = true;
    this.drawingPoints = [];
    this.clearCustomTerritory();
    this.map.getContainer().style.cursor = 'crosshair';
  }

  public stopDrawing(): void {
    this.isDrawingMode = false;
    this.map.getContainer().style.cursor = '';
    if (this.drawingPoints.length >= 3) {
      this.finishDrawing();
    }
  }

  public addDrawingPoint(latlng: L.LatLng): void {
    this.drawingPoints.push(latlng);

    // Add point marker
    const marker = L.circleMarker(latlng, {
      radius: 5,
      fillColor: '#ff7800',
      color: '#ff7800',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.8,
    }).addTo(this.drawingLayer);

    // Update drawing polygon
    if (this.currentDrawing) {
      this.drawingLayer.removeLayer(this.currentDrawing);
    }

    if (this.drawingPoints.length >= 2) {
      this.currentDrawing = L.polygon(this.drawingPoints, {
        fillColor: '#ff7800',
        color: '#ff7800',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.3,
        dashArray: '5, 5',
      }).addTo(this.drawingLayer);
    }
  }

  public finishDrawing(): void {
    if (this.drawingPoints.length >= 3) {
      // Create custom territory
      this.customTerritory = {
        type: 'Feature',
        properties: {
          name: 'Custom Territory',
          id: 'custom_territory',
          population: 0,
          isCustom: true,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            this.drawingPoints.map((point) => [point.lng, point.lat]),
          ],
        },
      };

      // Clear drawing layer and add final territory
      this.drawingLayer.clearLayers();

      const finalPolygon = L.polygon(this.drawingPoints, {
        fillColor: '#ff7800',
        color: '#ff7800',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.6,
      }).addTo(this.drawingLayer);

      finalPolygon.bindPopup(`
        <div>
          <h3>Custom Territory</h3>
          <p>Area: ${this.calculatePolygonArea(this.drawingPoints).toFixed(
            2
          )} km²</p>
          <p><strong>Custom drawn territory</strong></p>
        </div>
      `);

      this.selectedTerritory = this.customTerritory;
      // Territory selected - search functionality now available
      this.isDrawingMode = false;
      this.map.getContainer().style.cursor = '';
    }
  }

  public clearCustomTerritory(): void {
    this.drawingLayer.clearLayers();
    this.customTerritory = null;
    this.currentDrawing = null;
    this.drawingPoints = [];
    if (this.selectedTerritory?.properties?.isCustom) {
      this.selectedTerritory = null;
      // Territory cleared
    }
  }

  public calculatePolygonArea(points: L.LatLng[]): number {
    // Simple area calculation (approximate)
    let area = 0;
    const earthRadius = 6371; // km

    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      const lat1 = (points[i].lat * Math.PI) / 180;
      const lat2 = (points[j].lat * Math.PI) / 180;
      const lng1 = (points[i].lng * Math.PI) / 180;
      const lng2 = (points[j].lng * Math.PI) / 180;

      area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
    }

    area = (Math.abs(area) * earthRadius * earthRadius) / 2;
    return area;
  }

  public selectTerritory(territoryId: string): void {
    const territory = this.territoriesData.features.find(
      (f: GeoJSON.Feature) => f.properties?.['id'] === territoryId
    );
    if (territory) {
      this.selectedTerritory = territory;
      // Custom territory created - search functionality now available

      // Update territory layer styles
      this.territoryLayer.eachLayer((layer: any) => {
        if (layer.feature.properties.id === territoryId) {
          layer.setStyle({
            fillColor: '#ff7800',
            color: '#ff7800',
            fillOpacity: 0.6,
          });
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

  // Step 2: Place search methods
  public async searchPlaces(): Promise<void> {
    if (!this.placeSearchQuery.trim()) {
      this.placeSearchResults = [];
      return;
    }

    this.isSearchingPlaces = true;
    this.territoryValidationResult = '';
    this.validationStatus = null;

    try {
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

    this.clearPlaceMarkers();

    const marker = L.marker([lat, lon]).addTo(this.map).bindPopup(`
        <div>
          <h4>📍 ${place.display_name}</h4>
          <p><strong>Coordinates:</strong> ${lat.toFixed(6)}, ${lon.toFixed(
      6
    )}</p>
        </div>
      `);

    this.searchedPlaces.push(marker);
    this.map.setView([lat, lon], 15);

    this.validatePlaceInTerritory(lat, lon, place.display_name);

    this.placeSearchResults = [];
    this.placeSearchQuery = place.display_name;
  }

  private validatePlaceInTerritory(
    lat: number,
    lon: number,
    placeName: string
  ): void {
    if (!this.selectedTerritory) {
      this.territoryValidationResult = 'No territory selected';
      this.validationStatus = 'error';
      return;
    }

    const point = [lon, lat];
    const isInside = this.isPointInPolygon(
      point,
      this.selectedTerritory.geometry
    );

    if (isInside) {
      this.territoryValidationResult = `"${placeName}" is within ${this.selectedTerritory.properties.name}`;
      this.validationStatus = 'success';
    } else {
      this.territoryValidationResult = `"${placeName}" is NOT within ${this.selectedTerritory.properties.name}`;
      this.validationStatus = 'error';
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

  // Utility methods
  public clearTerritorySelection(): void {
    this.selectedTerritory = null;
    // Territory and search cleared
    this.clearPlaceSearch();
    this.clearCustomTerritory();
    this.isDrawingMode = false;
    this.map.getContainer().style.cursor = '';

    this.territoryLayer.eachLayer((layer: any) => {
      layer.setStyle({
        fillColor: '#3388ff',
        color: '#3388ff',
        fillOpacity: 0.3,
      });
    });

    this.map.fitBounds(this.territoryLayer.getBounds());
  }

  public clearPlaceSearch(): void {
    this.placeSearchQuery = '';
    this.placeSearchResults = [];
    this.territoryValidationResult = '';
    this.validationStatus = null;
    this.clearPlaceMarkers();
  }

  private clearPlaceMarkers(): void {
    this.searchedPlaces.forEach((marker) => {
      this.map.removeLayer(marker);
    });
    this.searchedPlaces = [];
  }

  public resetStepper(): void {
    this.clearTerritorySelection();
    this.clearPlaceSearch();
  }
}
