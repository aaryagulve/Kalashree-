Place your Compass-exported JSON files here:

  users.json
  attendances.json
  fees.json
  homeworks.json
  feedbacks.json
  ragalists.json
  events.json

Then run: node seed.js --from-json
Or to clear first: node seed.js --clear --from-json

HOW TO EXPORT FROM COMPASS:
1. Open MongoDB Compass
2. Connect to localhost:27017
3. Click database "kalashree"
4. Click each collection
5. Click "Export Collection" button (top right)
6. Choose JSON format
7. Save with the exact filenames listed above
