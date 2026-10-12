import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, NgZone, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Controller, UiSnapshot } from './engine/controller';
import { ALGORITHMS, AlgorithmId, FRONTIER, IDLE, MAZES, MazeId, PATH, Status, VISITED, WALL, WEIGHT } from './engine/constants';

@Component({
  selector: 'app-root', standalone: true, imports: [CommonModule],
  templateUrl: './app.component.html', styleUrl: './app.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly algorithms = ALGORITHMS;
  readonly mazeOptions = MAZES;
  readonly algorithmIds: AlgorithmId[] = ['dijkstra', 'astar', 'bfs', 'dfs'];
  readonly mazeIds: MazeId[] = ['recursive-division', 'random-walls', 'weight-clusters'];
  controller = new Controller(21, 45);
  ui: UiSnapshot = this.controller.getSnapshot();
  indices: number[] = Array.from({ length: this.ui.store.n }, (_, i) => i);
  private unsubscribe?: () => void;
  private resizeObserver?: ResizeObserver;
  private resizeTimer?: number;
  measured = false;
  isPointerDown = false;

  constructor(private cdr: ChangeDetectorRef, private zone: NgZone) { }

  ngOnInit(): void {
    this.unsubscribe = this.controller.subscribe(() => {
      this.zone.run(() => {
        this.ui = this.controller.getSnapshot();
        this.cdr.markForCheck();
      });
    });
    window.addEventListener('pointerup', this.onPointerUp);
  }

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      this.resizeObserver = new ResizeObserver(() => {
        window.clearTimeout(this.resizeTimer);
        this.resizeTimer = window.setTimeout(() => this.fitBoard(), 180);
      });
      const board = document.querySelector('.board-grid-wrap');
      if (board) this.resizeObserver.observe(board);
      this.fitBoard();
    });
  }

  ngOnDestroy(): void {
    this.unsubscribe?.();
    this.controller.dispose();
    this.resizeObserver?.disconnect();
    window.clearTimeout(this.resizeTimer);
    window.removeEventListener('pointerup', this.onPointerUp);
  }

  private onPointerUp = (): void => {
    this.isPointerDown = false;
    this.controller.pointerUp();
  };

  @HostListener('window:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (event.metaKey || event.ctrlKey || event.altKey || target?.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (event.key === ' ' && target?.closest('button')) return;
    const key = event.key.toLowerCase();
    if (key === ' ') this.controller.toggle();
    else if (key === 'r') this.controller.reset(false);
    else if (key === 'c' && !this.controller.busy) this.controller.reset(true);
    else if (key === 'w') this.controller.toggleTool();
    else return;
    event.preventDefault();
  }

  private fitBoard(): void {
    const el = document.querySelector('.board-grid-wrap') as HTMLElement | null;
    if (!el) return;
    const width = el.clientWidth;
    if (width < 100) return;
    if (this.controller.busy) { this.measured = true; return; }
    const odd = (n: number) => n % 2 ? n : n - 1;
    const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
    const target = width < 640 ? 19 : 22;
    const cols = odd(clamp(Math.floor(width / target), 15, 59));
    const cell = width / cols;
    const rows = odd(clamp(Math.floor(Math.min(window.innerHeight * 0.64, 700) / cell), 11, 29));
    this.controller.resize(rows, cols);
    this.indices = Array.from({ length: this.ui.store.n }, (_, i) => i);
    this.measured = true;
    this.zone.run(() => this.cdr.markForCheck());
  }

  setSpeed(event: Event): void {
    const speed = Number((event.target as HTMLInputElement).value);
    this.controller.setSpeed(speed);
  }

  selectAlgorithm(event: Event): void { this.controller.setAlgorithm((event.target as HTMLSelectElement).value as AlgorithmId); }
  selectedMaze: MazeId | '' = '';

  selectMaze(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as MazeId;
    if (!value) return;

    this.selectedMaze = value;
    this.controller.buildMaze(value);
  }
  setTool(tool: 'wall' | 'weight'): void { this.controller.setTool(tool); }
  toggle(): void { this.controller.toggle(); }
  reset(clear: boolean): void { this.controller.reset(clear); }
  cellClass(i: number): string {
    const s = this.ui.store;
    if (i === s.start) return 'cell marker start-marker';
    if (i === s.end) return 'cell marker target-marker';
    const kind = s.kinds[i];
    if (kind === WALL) return 'cell wall-cell';
    if (kind === WEIGHT) return `cell weight-cell ${this.visClass(i)}`;
    return `cell ${this.visClass(i)}`;
  }
  private visClass(i: number): string {
    const v = this.ui.store.vis[i];
    if (v === FRONTIER) return 'frontier-cell';
    if (v === VISITED) return 'visited-cell';
    if (v === PATH) return 'path-cell';
    return '';
  }
  cellSymbol(i: number): string {
    if (i === this.ui.store.start) return '»';
    if (i === this.ui.store.end) return '✦';
    return this.ui.store.kinds[i] === WEIGHT ? '♧' : '';
  }
  pointerDown(i: number, event: PointerEvent): void {
    if (event.button !== 0) return;
    this.isPointerDown = true;
    this.controller.pointerDown(i);
  }
  pointerEnter(i: number): void { if (this.isPointerDown) this.controller.pointerMove(i); }
  get statusLabel(): string {
    const labels: Record<Status, string> = { idle: 'IDLE', building: 'BUILDING', exploring: 'EXPLORING', paused: 'PAUSED', found: 'PATH FOUND', unreachable: 'NO PATH' };
    return labels[this.ui.status];
  }
  trackIndex(index: number): number { return index; }
  get currentAlgorithm() { return this.algorithms[this.ui.algorithm]; }
  get speedLabel(): string { return `${Math.round(6 * Math.pow(250, this.ui.speed / 100))} /s`; }
  get timeLabel(): string { return this.ui.timeMs === null ? '—' : `${this.ui.timeMs.toFixed(2)} ms`; }
  get pathLabel(): string { return this.ui.pathLength ? String(this.ui.pathLength) : this.ui.status === 'found' ? '0' : '—'; }
  get costLabel(): string { return this.ui.status === 'found' ? String(this.ui.cost) : '—'; }
}
