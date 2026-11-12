import { render } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';

import {
  FacilityCardSkeleton,
  MenuListSkeleton,
  OfferCardSkeleton,
  RoomCardSkeleton,
  SkeletonGrid,
} from './Skeletons';

describe('loading skeletons', () => {
  it('renders card layouts without accessibility violations', async () => {
    const { container } = render(
      <div>
        <RoomCardSkeleton />
        <OfferCardSkeleton />
        <FacilityCardSkeleton />
        <MenuListSkeleton rows={2} />
      </div>,
    );

    // Colour contrast is meaningless for placeholder blocks.
    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  });

  it('can repeat skeletons in a grid', () => {
    const { getAllByRole } = render(
      <SkeletonGrid count={2}>{() => <OfferCardSkeleton />}</SkeletonGrid>,
    );
    expect(getAllByRole('status')).toHaveLength(2);
  });
});
