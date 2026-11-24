function routeGesture(view, y, dx, dy) {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 56) return null;
  const horizontal = Math.abs(dx) > Math.abs(dy);
  if (view === 'home') return horizontal ? (dx > 0 ? 'people' : 'own') : (dy > 0 ? 'calendar' : null);
  if (view === 'calendar' && y < 96 && !horizontal && dy < 0) return 'home';
  if (view === 'own' && horizontal && dx > 0) return 'home';
  if (view === 'people') {
    if (y < 96 && horizontal && dx < 0) return 'home';
    if (y >= 214 && y <= 754) return horizontal ? (dx > 0 ? 'request' : 'skip') : (dy > 0 ? 'detail' : null);
  }
  if (view === 'detail' && y < 96 && !horizontal && dy < 0) return 'people';
  return null;
}
