import { DRAWABLE_INDEX, STATS } from '../../lib/site-data';
import { Faq } from './faq';
import { AddressAnatomy, ClosingCta, HeroReel, PictureFinder, RevealObserver, SlotExplorer, UseCases } from './home';
import { SiteFooter } from './site-footer';
import { SiteNav } from './site-nav';

export function Homepage() {
  return (
    <div className="min-h-svh bg-canvas">
      <SiteNav />
      <main>
        <HeroReel renders={STATS.renders} />
        <AddressAnatomy index={DRAWABLE_INDEX} />
        <UseCases index={DRAWABLE_INDEX} />
        <SlotExplorer index={DRAWABLE_INDEX} />
        <PictureFinder index={DRAWABLE_INDEX} />
        <Faq index={DRAWABLE_INDEX} />
        <ClosingCta index={DRAWABLE_INDEX} renders={STATS.renders} />
      </main>
      <SiteFooter className="relative z-10 -mt-24" />
      <RevealObserver />
    </div>
  );
}
