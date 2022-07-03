# TypeschemaAngularEditor

This package provides an Angular Editor Component which provides a visual
editor to design a [TypeSchema](https://typeschema.org/). It also integrates
with the [typehub.cloud](https://typehub.cloud/) API so that a user can integrate
remote schemas registered at the cloud. The following screenshot shows an example
of the editor:

![Preview](./assets/preview.png)

We use this component in different products:

* [Fusio](https://www.fusio-project.org/)
* [APIgen](https://apigen.app/)
* [TypeHub](https://typehub.cloud/)

## Usage

You can use the `typeschema-editor` component directly in your template

```angular2html
<typeschema-editor [specification]="spec" [importEnabled]="false" (save)="submit($event)" (preview)="preview($event)"></typeschema-editor>
```

In your controller you can then listen on the save and preview event:

```typescript
export class DesignerComponent implements OnInit {

  spec: Specification = {
    imports: [],
    types: []
  };

  ngOnInit(): void {
  }

  submit(spec: Specification) {
    // is called everytime a user clicks on the save button
  }

  preview(spec: Specification) {
    // is called everytime the user changes the schema through the editor
  }

}
```

If you set `importEnabled` to `true` then a user can include schemas from our global
TypeHub repository.

## Development

Internally the component does not work directly on a TypeSchema JSON instead it uses
an internal representation. The `Specification` is the internal representation, if
you want to turn this into a TypeSchema you can use the `InternalToTypeSchemaService`
service. There is also an `TypeSchemaToInternalService` service which converts a
TypeSchema into the internal `Specification` representation.
