let themes = [
  'Space', 'Seaside', 'Storm', 'Sunset', 'Alpine', 'Loss', 'Faith',
  'Love', 'Nostalgia', 'Earth', 'Revolution', 'Empire', 'Cutting Edge', 'Time',
]; //I literally just picked these off the top of my head, feel free to add more
let used = [];

export function selectRandomTheme() {
  if (themes.length === 0) {
    themes = used;
    used = [];
  }

  const index = Math.floor(Math.random() * themes.length);
  const selection = themes.splice(index, 1)[0]; //picks and removes the theme from the array
  used.push(selection);
  return selection;
}
