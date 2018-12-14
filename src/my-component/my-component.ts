import {
  Component,
  EventEmitter,
  Input,
  NgModule,
  Output,
} from '@angular/core';
import {CommonModule} from '@angular/common';
import {interval} from 'rxjs';

@Component({
  templateUrl: './my-component.html',
  styleUrls: ['./my-component.scss'],
})
export class MyComponent {
  count = interval(1000);

  @Input() title;

  @Output() titleChange = new EventEmitter<string>();

  constructor() {
    this.count.subscribe(console.log);
  }

  ngOnDestroy() {
    console.log();
  }
}

@NgModule({
  declarations: [MyComponent],
  imports: [CommonModule]
})
export class MyComponentModule {}
