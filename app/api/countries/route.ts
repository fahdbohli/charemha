import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const baseDataDir = path.join(process.cwd(), 'public', 'arb_output', 'arb_opportunities');

    const modes = ['live', 'prematch'];
    const result: { [mode: string]: { [sport: string]: string[] } } = { live: {}, prematch: {} };

    for (const mode of modes) {
      const modeDir = path.join(baseDataDir, mode);
      let sportDirs: string[] = [];
      try {
        sportDirs = (await fs.readdir(modeDir, { withFileTypes: true }))
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name);
      } catch (error: any) {
        console.warn(`Could not read directory ${modeDir}: ${error.message}`);
        continue; // Skip to next mode if directory doesn't exist
      }

      for (const sport of sportDirs) {
        const sportPath = path.join(modeDir, sport);
        let countryFiles: string[] = [];
        try {
          countryFiles = (await fs.readdir(sportPath))
            .filter(file => file.endsWith('.json') && file !== 'activity_tracker.json');
        } catch (error: any) {
          console.warn(`Could not read directory ${sportPath}: ${error.message}`);
          continue; // Skip to next sport if directory doesn't exist
        }
        result[mode][sport] = countryFiles.map(file => file.replace('.json', '')).sort();
      }
    }

    console.log('Returning available sports and countries:', result);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Failed to read directories:', error);
    return NextResponse.json({ error: 'Failed to fetch available sports and countries' }, { status: 500 });
  }
}