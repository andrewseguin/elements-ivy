import {NgElementStrategy, NgElementStrategyEvent, NgElementStrategyFactory} from '@angular/elements';
import {
  EventEmitter,
  Injector,
  ɵLifecycleHooksFeature as LifecycleHooksFeature,
  ɵmarkDirty as markDirty,
  ɵrenderComponent as renderComponent,
} from '@angular/core';
import {merge, Observable} from 'rxjs';
import {ComponentType} from '@angular/core/src/render3';
import {map} from 'rxjs/operators';

/** Time in milliseconds to wait before destroying the component ref when disconnected. */
const DESTROY_DELAY = 10;

export class IvyNgElementStrategyFactory<T> implements NgElementStrategyFactory {

  constructor(private componentType: ComponentType<T>) {}

  create(injector: Injector): NgElementStrategy {
    return new IvyNgElementStrategy(this.componentType);
  }
}

export class IvyNgElementStrategy<T> implements NgElementStrategy {
  /** Merged stream of the component's output events. */
  // TODO(issue/24571): remove '!'.
  events: Observable<NgElementStrategyEvent>;

  /** Reference to the component that was created on connect. */
  // TODO(issue/24571): remove '!'.
  private component !: T| null;

  /** Reference number returned by setTimeout when scheduling to destroy. */
  private destroyTimeoutRef: number | null = null;

  /** Initial input values that were set before the component was created. */
  private readonly initialInputValues = new Map<string, any>();

  constructor(private componentType: ComponentType<T>) {}

  /**
   * Initializes a new component if one has not yet been created and cancels any scheduled
   * destruction.
   */
  connect(element: HTMLElement): void {
    if (this.destroyTimeoutRef !== null) {
      clearTimeout(this.destroyTimeoutRef);
      this.destroyTimeoutRef = null;
      return;
    }

    if (!this.component) {
      this.initializeComponent(element);
    }
  }

  /**
   * Schedules the component to be destroyed after some small delay in case the element is just
   * being moved across the DOM.
   */
  disconnect(): void {
    if (!this.component || this.destroyTimeoutRef !== null) {
      return;
    }

    this.scheduleDestroy();
  }

  /**
   * Returns the component property value. If the component has not yet been created, the value is
   * retrieved from the cached initialization values.
   */
  getInputValue(propName: string): any {
    if (!this.component) {
      return this.initialInputValues.get(propName);
    }

    return this.component[propName];
  }

  /**
   * Sets the input value for the property. If the component has not yet been created, the value is
   * cached and set when the component is created.
   */
  setInputValue(propName: string, value: string): void {
    if (strictEquals(value, this.getInputValue(propName))) {
      return;
    }

    // If the component has not yet been connected, store the input values in order to
    // initialize them onto the component after connected.
    if (!this.component) {
      this.initialInputValues.set(propName, value);
      return;
    }

    this.component[propName] = value;
    markDirty(this.component);
  }


  /**
   * Renders the component on the host element and initializes the inputs and outputs.
   */
  protected initializeComponent(element: HTMLElement) {
    this.component = renderComponent(this.componentType, {
      host: element as any,
      hostFeatures: [LifecycleHooksFeature],
    });

    this.initializeInputs();
    this.initializeOutputs();

    markDirty(this.component); 
  }

  /** Set any stored initial inputs on the component's properties. */
  protected initializeInputs(): void {
    const inputs = Object.keys(this.componentType.ngComponentDef['inputs']);
    inputs.forEach(prop => this.setInputValue(prop, this.initialInputValues.get(prop)));

    this.initialInputValues.clear();
  }

  /** Sets up listeners for the component's outputs so that the events stream emits the events. */
  protected initializeOutputs(): void {
    const outputs = Object.keys(this.componentType.ngComponentDef['outputs']);
    const eventEmitters = outputs.map(propName => {
      const templateName = this.componentType.ngComponentDef['outputs'][propName];

      const emitter = this.component[propName] as EventEmitter<any>;
      return emitter.pipe(map((value: any) => ({name: templateName, value})));
    });

    this.events = merge(...eventEmitters);
  }

  private scheduleDestroy() {
    this.destroyTimeoutRef = setTimeout(() => {
      if (this.component) {
        const onDestroy = this.component['ngOnDestroy'];
        if (onDestroy) {
          onDestroy();
        }
        this.component = null;
      }
    }, DESTROY_DELAY);
  }
}

/**
 * Test two values for strict equality, accounting for the fact that `NaN !== NaN`.
 */
export function strictEquals(value1: any, value2: any): boolean {
  return value1 === value2 || (value1 !== value1 && value2 !== value2);
}
