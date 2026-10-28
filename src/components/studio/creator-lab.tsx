'use client';

import { useState } from 'react';
import { CaptureKeyer } from './capture-keyer';
import { Pills } from './controls';
import { PedStudio } from './ped-studio';

type Mode = 'studio' | 'keyer';

export function CreatorLab() {
  const [mode, setMode] = useState<Mode>('studio');
  const modeSwitch = (
    <div data-tour="mode" className="w-[260px]">
      <Pills
        label="Mode"
        value={mode}
        options={['studio', 'keyer'] as Mode[]}
        render={(o) => (o === 'studio' ? 'Ped studio' : 'Key captures')}
        onChange={setMode}
      />
    </div>
  );
  return mode === 'studio' ? <PedStudio modeSwitch={modeSwitch} /> : <CaptureKeyer modeSwitch={modeSwitch} />;
}
