export type IconName =
  | 'lock'
  | 'unlock'
  | 'plus'
  | 'minus'
  | 'shuffle'
  | 'undo'
  | 'redo'
  | 'copy'
  | 'close'
  | 'image'
  | 'download'
  | 'save'
  | 'grid'
  | 'layers'
  | 'search'
  | 'trash'
  | 'info'
  | 'check'
  | 'left'
  | 'right'
  | 'swap'
  | 'pencil'
  | 'link';

const PATHS: Record<IconName, string> = {
  lock: 'M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5z',
  unlock: 'M7 10V7a5 5 0 0 1 9.6-2M5 10h14v11H5z',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  shuffle: 'M4 6h4l8 12h4M4 18h4l2-3M18 4l3 2-3 2M18 16l3 2-3 2',
  undo: 'M9 14 4 9l5-5M4 9h9a7 7 0 0 1 0 14h-3',
  redo: 'm15 14 5-5-5-5M20 9h-9a7 7 0 0 0 0 14h3',
  copy: 'M9 9h11v11H9zM4 15V4h11',
  close: 'M6 6l12 12M18 6L6 18',
  image: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6',
  download: 'M12 3v12m0 0 5-5m-5 5-5-5M4 20h16',
  save: 'M5 4h11l4 4v12H5zM9 4v6h6V4M8 20v-6h8v6',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  layers: 'm12 3 9 5-9 5-9-5zM3 14l9 5 9-5M3 11l9 5 9-5',
  search: 'M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16zM21 21l-4.3-4.3',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6',
  info: 'M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zM12 11v6M12 7.5v.5',
  check: 'm4 12 5 6L20 6',
  left: 'm14 5-7 7 7 7',
  right: 'm10 5 7 7-7 7',
  swap: 'M4 8h13l-3-3M20 16H7l3 3',
  pencil: 'M4 20h4L20 8l-4-4L4 16zM14 6l4 4',
  link: 'M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1',
};

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
