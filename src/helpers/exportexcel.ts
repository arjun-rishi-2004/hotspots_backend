import ExcelJS from 'exceljs';
import fs from 'fs';

/**
 * Converts an array of place objects into an Excel file.
 * @param {Array} placesArray - The array of place data.
 * @param {string} outputPath - Path to save the Excel file.
 */
export async function exportPlacesToExcel(placesArray, outputPath = 'output.xlsx') {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Places');

  // Add header row
  sheet.columns = [
    { header: 'Name', key: 'name', width: 30 },
    { header: 'ID', key: 'id', width: 30 },
    { header: 'Location Name', key: 'locationName', width: 25 },
    { header: 'Types', key: 'types', width: 40 },
    { header: 'Address', key: 'address', width: 40 },
    { header: 'Google Maps URI', key: 'googleMapsUri', width: 45 },
    { header: 'Latitude', key: 'latitude', width: 15 },
    { header: 'Longitude', key: 'longitude', width: 15 },
    { header: 'Rating', key: 'rating', width: 10 },
    { header: 'User Rating Count', key: 'userRatingCount', width: 20 },
    { header: 'Charging Stations Nearby', key: 'chargingStations', width: 25 },
    {header:'Rating count based score',key:'ratingCountScore_',width:15},
    {header:'Parking Based Score',key:'parkingBasedScore',width:15},
    { header: 'Rating Based Score', key: 'ratingBasedScore', width: 15 },    
    { header: 'Charger Based Score', key: 'chargerBasedScore', width: 15 },
    { header: 'Total Weight', key: 'totalWeight', width: 15 },
  ];

  // Add data rows
  for (const place of placesArray) {
    sheet.addRow({
      name: place.name,
      id: place.id,
      locationName: place.locationName,
      types: place.types.join(', '),
      address: place.address,
      googleMapsUri: place.googleMapsUri,
      latitude: place.latitude,
      longitude: place.longitude,
      rating: place.rating,
      userRatingCount: place.userRatingCount,
      chargingStations: place.nearestChargeStationDetail?.length || 0,
      ratingCountScore_: place.ratingCountScore,
      parkingBasedScore:place.parkingBasedScore,
      ratingBasedScore: place.ratingBasedScore,
      chargerBasedScore: place.chargerBasedScore,
      totalWeight: place.totalWeight,
    });
  }

  // Save to file
  await workbook.xlsx.writeFile(outputPath);
  console.log(`Excel file saved to ${outputPath}`);
}
