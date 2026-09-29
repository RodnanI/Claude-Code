import { Recipe } from '../voxel/recipe.js';
import { M } from '../voxel/palette.js';

/**
 * Collects the named parts of an aircraft. A part is a Recipe plus a pivot. Recipes are authored in body
 * coordinates unless `local: true`, in which case they are authored around the pivot (needles, propellers, wheels).
 * Options: group ('exterior' | 'interior'), hideInCockpit, visibleWhen (channel name), voxel (override size).
 */
export class ModelKit {
  constructor() {
    this.parts = [];
    this.M = M;
  }
  part(name, opts = {}) {
    const recipe = new Recipe();
    this.parts.push({ name, recipe, pivot: opts.pivot || [0, 0, 0], local: !!opts.local, group: opts.group || 'exterior', hideInCockpit: !!opts.hideInCockpit, visibleWhen: opts.visibleWhen || null, voxel: opts.voxel || 0 });
    return recipe;
  }
  interior(name, opts = {}) { return this.part(name, { ...opts, group: 'interior' }); }
}
