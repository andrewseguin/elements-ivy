import {MyComponent} from './my-component/my-component';
import {createCustomElement} from '@angular/elements';
import {IvyNgElementStrategyFactory} from './ivy-strategy-factory';
import {Component, ɵComponentType as ComponentType} from '@angular/core';
import {ɵrenderComponent as renderComponent} from '@angular/core';

const injector = createInjector();
const strategyFactory = createStrategyFactory();

const MyElement = createCustomElement(MyComponent, {injector, strategyFactory});
customElements.define('my-element', MyElement as any);


function createInjector() {
  return {
    get() {
      return {
        resolveComponentFactory: (component: ComponentType<any>) => {
          const inputs = Object.keys(component.ngComponentDef['inputs']).map(input => {
            return {
              propName: input,
              templateName: component.ngComponentDef['inputs'][input]
            };
          });

          return {inputs};
        }
      };
    }
  }
}

function createStrategyFactory() {
  return new IvyNgElementStrategyFactory(MyComponent as ComponentType<MyComponent>);
}
