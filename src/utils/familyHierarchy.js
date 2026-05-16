// Helpers for product family hierarchy: depth calculation, descendants, level labels.

// Depth = 1 for root families (no parent_family_id), N+1 for each level deeper.
export function computeFamilyDepth(family, allFamilies) {
  if (!family) return 0;
  let depth = 1;
  let cur = family;
  const seen = new Set();
  while (cur?.parent_family_id) {
    if (seen.has(cur.id)) break;
    seen.add(cur.id);
    cur = allFamilies.find(f => f.id === cur.parent_family_id);
    if (!cur) break;
    depth++;
  }
  return depth;
}

// Returns set of family IDs that are descendants of the given family (not including itself).
export function getDescendantFamilyIds(familyId, allFamilies) {
  const out = new Set();
  const stack = [familyId];
  while (stack.length) {
    const id = stack.pop();
    for (const f of allFamilies) {
      if (f.parent_family_id === id && !out.has(f.id)) {
        out.add(f.id);
        stack.push(f.id);
      }
    }
  }
  return out;
}

// Returns set of family IDs that are descendants of the given family, INCLUDING itself.
export function getFamilyAndDescendantIds(familyId, allFamilies) {
  const set = getDescendantFamilyIds(familyId, allFamilies);
  set.add(familyId);
  return set;
}

// Returns the effective category id for a family — by walking up the family chain
// until one with parent_cat_id is found. Returns null if no category in the chain.
// Accepts a partial family (used in forms before save).
export function getEffectiveCategoryId(family, allFamilies) {
  if (!family) return null;
  if (family.parent_cat_id) return family.parent_cat_id;
  let cur = family;
  const seen = new Set();
  while (cur?.parent_family_id) {
    if (cur.id && seen.has(cur.id)) break;
    if (cur.id) seen.add(cur.id);
    cur = allFamilies.find(f => f.id === cur.parent_family_id);
    if (!cur) break;
    if (cur.parent_cat_id) return cur.parent_cat_id;
  }
  return null;
}

// Returns set of family IDs that belong (directly or transitively) to the given category.
// A family belongs to a category if its root ancestor's parent_cat_id matches.
export function getCategoryFamilyIds(categoryId, allFamilies) {
  const out = new Set();
  // Roots under this category
  const roots = allFamilies.filter(f => !f.parent_family_id && f.parent_cat_id === categoryId);
  for (const r of roots) {
    out.add(r.id);
    for (const d of getDescendantFamilyIds(r.id, allFamilies)) out.add(d);
  }
  return out;
}

// Resolve label for a given family: per-node level_label > global level definition by depth > fallback.
export function getFamilyLevelLabel(family, allFamilies, levelDefs) {
  if (!family) return '';
  if (family.level_label?.trim()) return family.level_label.trim();
  const depth = computeFamilyDepth(family, allFamilies);
  const def = (levelDefs || []).find(d => d.depth === depth);
  if (def) return def.name;
  return depth === 1 ? 'משפחה' : `משפחת משנה רמה ${depth - 1}`;
}

// Natural numeric sort for "num" strings: "103" < "171" < "171-1" < "171-2" < "171-10".
// Splits by '-' and compares each segment as integer.
export function compareNum(aNum, bNum) {
  const a = aNum == null ? '' : String(aNum).trim();
  const b = bNum == null ? '' : String(bNum).trim();
  if (!a && !b) return 0;
  if (!a) return 1;   // missing num goes last
  if (!b) return -1;
  const ap = a.split('-').map(s => {
    const n = parseInt(s, 10);
    return isNaN(n) ? 0 : n;
  });
  const bp = b.split('-').map(s => {
    const n = parseInt(s, 10);
    return isNaN(n) ? 0 : n;
  });
  for (let i = 0; i < Math.max(ap.length, bp.length); i++) {
    const av = ap[i] ?? 0;
    const bv = bp[i] ?? 0;
    if (av !== bv) return av - bv;
  }
  // Same numeric structure — fall back to string compare to keep it deterministic
  return a.localeCompare(b);
}

// Sort siblings: explicit display_order (>0) wins; else natural num sort; else name.
// This way drag-drop reordering still works, but the default ordering is by num ascending.
export const sortSiblings = (arr) => arr.slice().sort((a, b) => {
  const oa = a.display_order ?? 0;
  const ob = b.display_order ?? 0;
  if (oa > 0 || ob > 0) {
    if (oa > 0 && ob > 0) return oa - ob;
    return oa > 0 ? -1 : 1;
  }
  const c = compareNum(a.num, b.num);
  if (c !== 0) return c;
  return (a.name || '').localeCompare(b.name || '', 'he');
});

// Build tree: array of root nodes (categories), each with .families[] (root families under it),
// and each family with .children[] recursively. Children sorted by display_order.
export function buildHierarchyTree(categories, families) {
  const familiesByParentFam = new Map(); // parent_family_id → []
  const familiesByCat = new Map();        // parent_cat_id → []  (only roots, parent_family_id null)
  const orphans = [];

  for (const f of families) {
    if (f.parent_family_id) {
      const arr = familiesByParentFam.get(f.parent_family_id) || [];
      arr.push(f);
      familiesByParentFam.set(f.parent_family_id, arr);
    } else if (f.parent_cat_id) {
      const arr = familiesByCat.get(f.parent_cat_id) || [];
      arr.push(f);
      familiesByCat.set(f.parent_cat_id, arr);
    } else {
      orphans.push(f);
    }
  }

  const attachChildren = (fam) => ({
    ...fam,
    children: sortSiblings(familiesByParentFam.get(fam.id) || []).map(attachChildren),
  });

  const catNodes = categories.map(c => ({
    ...c,
    type: 'category',
    families: sortSiblings(familiesByCat.get(c.id) || []).map(attachChildren),
  }));

  return { categories: catNodes, orphans: sortSiblings(orphans).map(attachChildren) };
}

// Get siblings (children of same parent family). For root families, parent_family_id should be null.
export function getSiblings(parentFamilyId, parentCatId, allFamilies) {
  if (parentFamilyId) {
    return allFamilies.filter(f => f.parent_family_id === parentFamilyId);
  }
  // Root family under category — no parent_family_id, parent_cat_id matches
  return allFamilies.filter(f => !f.parent_family_id && f.parent_cat_id === parentCatId);
}

// Next display_order to use when adding a new child (max existing + 1, or 1 if none).
export function getNextChildOrder(parentFamilyId, parentCatId, allFamilies) {
  const siblings = getSiblings(parentFamilyId, parentCatId, allFamilies);
  if (siblings.length === 0) return 1;
  const max = siblings.reduce((m, f) => Math.max(m, f.display_order || 0), 0);
  return Math.max(max, siblings.length) + 1;
}

// Format a sub-family's auto-generated num: "${parent.num}-${order}".
// Returns null if parent has no num (caller should fall back to leaving num blank).
export function formatChildNum(parentNum, order) {
  if (!parentNum || !String(parentNum).trim()) return null;
  return `${String(parentNum).trim()}-${order}`;
}

// After a reorder of `parent`'s direct children, build the list of update payloads
// {id, num, display_order} for those children AND all their descendants whose nums
// need to cascade. `orderedChildIds` is the new sibling order for the parent.
//
// parent: a family object (with .num) OR null when reordering roots under a category.
// In the root-under-category case, root families keep their existing num as-is (we only
// renumber sub-families because their num is derived from a parent num).
export function buildReorderUpdates(parent, orderedChildIds, allFamilies) {
  const updates = [];
  const familiesById = new Map(allFamilies.map(f => [f.id, f]));

  const renumberSubtree = (familyId, parentNum, position) => {
    const fam = familiesById.get(familyId);
    if (!fam) return;
    const newOrder = position;
    const autoNum = formatChildNum(parentNum, newOrder);
    // For root families (parent is null = renumbering roots under a category), keep existing num.
    // For sub-families, override num with derived value.
    const newNum = parentNum ? autoNum : (fam.num ?? null);
    if ((fam.display_order || 0) !== newOrder || fam.num !== newNum) {
      updates.push({ id: fam.id, num: newNum, display_order: newOrder });
    }
    // Cascade to children — they keep their existing display_order but their num is rebuilt
    // from the (possibly new) parent num.
    const kids = allFamilies
      .filter(f => f.parent_family_id === fam.id)
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    kids.forEach((kid, i) => {
      const kidPos = kid.display_order || (i + 1);
      renumberSubtree(kid.id, newNum, kidPos);
    });
  };

  const parentNum = parent ? (parent.num ?? null) : null;
  orderedChildIds.forEach((cid, idx) => {
    renumberSubtree(cid, parentNum, idx + 1);
  });
  return updates;
}
