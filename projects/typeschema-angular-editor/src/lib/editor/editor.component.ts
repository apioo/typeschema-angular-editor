import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {NgbModal, NgbOffcanvas} from '@ng-bootstrap/ng-bootstrap';
import {Observable, of, OperatorFunction} from 'rxjs';
import {catchError, debounceTime, distinctUntilChanged, map, switchMap, tap} from 'rxjs/operators';
import {fromPromise} from "rxjs/internal/observable/innerFrom";
import {Document} from "typehub-javascript-sdk/dist/src/Document";
import {Message} from "typehub-javascript-sdk/dist/src/Message";
import {Specification} from "../model/Specification";
import {Type} from "../model/Type";
import {Property} from "../model/Property";
import {Include} from "../model/Include";
import {ImportService, SchemaType} from "../import.service";
import {TypeHubService} from "../typehub.service";
import {Operation} from "../model/Operation";
import {Throw} from "../model/Throw";
import {ViewportScroller} from "@angular/common";
import {Security} from "../model/Security";
import {BCLayerService} from "../bclayer.service";

@Component({
  selector: 'typeschema-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.css']
})
export class EditorComponent implements OnInit {

  @Input() specification: Specification = {
    imports: [],
    operations: [],
    types: [],
  };
  @Input() operationEnabled: boolean = false;
  @Input() importEnabled: boolean = true;
  @Input() readonly: boolean = false;

  @Output() save = new EventEmitter<Specification>();
  @Output() change = new EventEmitter<Specification>();

  operation: Operation = {
    name: '',
    description: '',
    httpMethod: 'GET',
    httpPath: '',
    httpCode: 200,
    arguments: [],
    throws: [],
    return: '',
  };

  throw: Throw = {
    code: 500,
    type: '',
  };

  type: Type = {
    type: 'object',
    name: '',
    description: '',
  };

  property: Property = {
    name: '',
    description: '',
    type: 'string',
  };

  import: string = '';
  importType: SchemaType = 'internal';
  export: string = '';

  loading = false;
  dirty = false;
  response?: Message;

  baseUrl?: string;
  security?: Security;

  include: Include = {
    alias: '',
    version: '0.1.0',
    document: undefined,
    types: []
  };
  includeVersions: Array<string> = [];
  searching = false;
  searchFailed = false;
  search: OperatorFunction<string, Array<Document>> = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      tap(() => (this.searching = true)),
      switchMap((term) =>
        fromPromise(this.typeHubService.findDocuments(term)).pipe(
          map((response) => {
            return response.entry ? response.entry : [];
          }),
          tap(() => (this.searchFailed = false)),
          catchError(() => {
            this.searchFailed = true;
            return of([]);
          }),
        ),
      ),
      tap(() => (this.searching = false)),
    );

  formatter = (document: Document) => {
    return document.user?.name + ' / ' + document.name;
  }

  constructor(private typeHubService: TypeHubService, private importService: ImportService, private bcLayerService: BCLayerService, private modalService: NgbModal, private offCanvasService: NgbOffcanvas, private viewportScroller: ViewportScroller) { }

  async ngOnInit(): Promise<void> {
    if (!Array.isArray(this.specification.operations)) {
      this.specification.operations = [];
    }

    if (!this.readonly && this.specification.imports.length > 0) {
      for (let i = 0; i < this.specification.imports.length; i++) {
        const include = this.specification.imports[i];
        if (include && !include.types) {
          this.specification.imports[i].types = await this.resolveIncludeTypes(include);
        }
      }
    }

    this.specification = this.bcLayerService.transform(this.specification);

    this.doChange();
  }

  doSave(): void {
    this.save.emit(this.specification);
    this.dirty = false;
  }

  doChange(): void {
    this.change.emit(this.specification);
  }

  setRoot(typeIndex: number) {
    this.specification.root = typeIndex;
  }

  upOperation(operationIndex: number): void {
    const operation = this.specification.operations.splice(operationIndex, 1)[0];
    if (!operation) {
      return;
    }
    this.specification.operations.splice(operationIndex - 1, 0, operation);
    this.dirty = true;
    this.doChange();
  }

  downOperation(operationIndex: number): void {
    const operation = this.specification.operations.splice(operationIndex, 1)[0];
    if (!operation) {
      return;
    }
    this.specification.operations.splice(operationIndex + 1, 0, operation);
    this.dirty = true;
    this.doChange();
  }

  openOperation(content: any): void {
    this.operation = {
      name: '',
      description: '',
      httpMethod: 'GET',
      httpPath: '',
      httpCode: 200,
      arguments: [],
      payload: '',
      payloadShape: undefined,
      throws: [],
      return: '',
      returnShape: undefined,
    };

    this.modalService.open(content, {size: 'lg'}).result.then((result) => {
      const operation = Object.assign({}, this.operation);

      if (!operation.name.match(/^[A-Za-z0-9_.]{1,32}$/)) {
        this.response = {
          success: false,
          message: 'Operation name must match the regular expression [A-Za-z0-9_.]{1,32}'
        };
        return;
      }

      this.specification.operations.push(operation);
      this.dirty = true;
      this.doChange();
    }, (reason) => {
    });
  }

  editOperation(content: any, operationIndex: number): void {
    this.operation = Object.assign({}, this.specification.operations[operationIndex]);

    this.modalService.open(content, {size: 'lg'}).result.then((result) => {
      const operation = Object.assign({}, this.operation);
      if (!operation.arguments) {
        operation.arguments = [];
      }
      if (!operation.throws) {
        operation.throws = [];
      }

      if (!operation.name.match(/^[A-Za-z0-9_.]{1,32}$/)) {
        this.response = {
          success: false,
          message: 'Type name must match the regular expression [A-Za-z0-9_.]{1,32}'
        };
        return;
      }

      this.specification.operations[operationIndex] = operation;
      this.dirty = true;
      this.doChange();
    }, (reason) => {
    });
  }

  upType(typeIndex: number): void {
    const type = this.specification.types.splice(typeIndex, 1)[0];
    if (!type) {
      return;
    }
    this.specification.types.splice(typeIndex - 1, 0, type);
    this.dirty = true;
    this.doChange();
  }

  downType(typeIndex: number): void {
    const type = this.specification.types.splice(typeIndex, 1)[0];
    if (!type) {
      return;
    }
    this.specification.types.splice(typeIndex + 1, 0, type);
    this.dirty = true;
    this.doChange();
  }

  openType(content: any): void {
    this.type = {
      type: 'object',
      name: '',
      description: '',
    };

    this.modalService.open(content, {size: 'lg'}).result.then((result) => {
      const type = Object.assign({}, this.type);
      type.properties = [];

      if (!type.name.match(/^[A-Za-z0-9_]{1,32}$/)) {
        this.response = {
          success: false,
          message: 'Type name must match the regular expression [A-Za-z0-9_]{1,32}'
        };
        return;
      }

      this.specification.types.push(type);
      this.dirty = true;
      this.doChange();
    }, (reason) => {
    });
  }

  editType(content: any, typeIndex: number): void {
    this.type = Object.assign({}, this.specification.types[typeIndex]);

    this.modalService.open(content, {size: 'lg'}).result.then((result) => {
      const type = Object.assign({}, this.type);
      if (!type.properties) {
        type.properties = [];
      }

      if (!type.name.match(/^[A-Za-z0-9_]{1,32}$/)) {
        this.response = {
          success: false,
          message: 'Type name must match the regular expression [A-Za-z0-9_]{1,32}'
        };
        return;
      }

      this.specification.types[typeIndex] = type;
      this.dirty = true;
      this.doChange();
    }, (reason) => {
    });
  }

  hasTypeReferenceContainsGeneric(reference: string|undefined): boolean {
    if (!reference) {
      return false;
    }

    const type = this.findTypeByName(reference);
    if (type === null) {
      return false;
    }

    const properties = type.properties;
    if (!properties) {
      return false;
    }

    for (let i = 0; i < properties.length; i++) {
      const refs = properties[i].refs;
      if (Array.isArray(refs) && refs.includes('T')) {
        return true;
      }
    }

    return false;
  }

  findOperationByName(operationName: string): Operation|null {
    for (let i = 0; i < this.specification.operations.length; i++) {
      if (this.specification.operations[i].name === operationName) {
        return this.specification.operations[i];
      }
    }

    return null;
  }

  findTypeByName(typeName: string): Type|null {
    for (let i = 0; i < this.specification.types.length; i++) {
      if (this.specification.types[i].name === typeName) {
        return this.specification.types[i];
      }
    }

    if (typeName.indexOf(':') === -1) {
      return null;
    }

    const parts = typeName.split(':');
    const namespace = parts[0];
    const name = parts[1];

    for (let i = 0; i < this.specification.imports.length; i++) {
      if (this.specification.imports[i].alias !== namespace) {
        continue;
      }

      const types = this.specification.imports[i].types;
      if (!types) {
        continue;
      }

      for (let j = 0; j < types.length; j++) {
        if (types[j].name === name) {
          return types[j];
        }
      }
    }

    return null;
  }

  deleteOperation(operationIndex: number): void {
    this.specification.operations.splice(operationIndex, 1);
    this.dirty = true;
    this.doChange();
  }

  upArgument(operationIndex: number, argumentIndex: number): void {
    const property = this.specification.operations[operationIndex].arguments?.splice(argumentIndex, 1)[0];
    if (!property) {
      return;
    }
    this.specification.operations[operationIndex].arguments?.splice(argumentIndex - 1, 0, property);
    this.dirty = true;
    this.doChange();
  }

  downArgument(operationIndex: number, argumentIndex: number): void {
    const property = this.specification.operations[operationIndex].arguments?.splice(argumentIndex, 1)[0];
    if (!property) {
      return;
    }
    this.specification.operations[operationIndex].arguments?.splice(argumentIndex + 1, 0, property);
    this.dirty = true;
    this.doChange();
  }

  deleteArgument(operationIndex: number, argumentIndex: number): void {
    if (!this.specification.operations[operationIndex]) {
      return;
    }
    this.specification.operations[operationIndex].arguments?.splice(argumentIndex, 1);
    this.dirty = true;
    this.doChange();
  }

  upThrow(operationIndex: number, throwIndex: number): void {
    const property = this.specification.operations[operationIndex].throws?.splice(throwIndex, 1)[0];
    if (!property) {
      return;
    }
    this.specification.operations[operationIndex].throws?.splice(throwIndex - 1, 0, property);
    this.dirty = true;
    this.doChange();
  }

  downThrow(operationIndex: number, throwIndex: number): void {
    const property = this.specification.operations[operationIndex].throws?.splice(throwIndex, 1)[0];
    if (!property) {
      return;
    }
    this.specification.operations[operationIndex].throws?.splice(throwIndex + 1, 0, property);
    this.dirty = true;
    this.doChange();
  }

  deleteThrow(operationIndex: number, throwIndex: number): void {
    if (!this.specification.operations[operationIndex]) {
      return;
    }
    this.specification.operations[operationIndex].throws?.splice(throwIndex, 1);
    this.dirty = true;
    this.doChange();
  }

  deleteType(typeIndex: number): void {
    this.specification.types.splice(typeIndex, 1);
    this.dirty = true;
    this.doChange();
  }

  upProperty(typeIndex: number, propertyIndex: number): void {
    const property = this.specification.types[typeIndex].properties?.splice(propertyIndex, 1)[0];
    if (!property) {
      return;
    }
    this.specification.types[typeIndex].properties?.splice(propertyIndex - 1, 0, property);
    this.dirty = true;
    this.doChange();
  }

  downProperty(typeIndex: number, propertyIndex: number): void {
    const property = this.specification.types[typeIndex].properties?.splice(propertyIndex, 1)[0];
    if (!property) {
      return;
    }
    this.specification.types[typeIndex].properties?.splice(propertyIndex + 1, 0, property);
    this.dirty = true;
    this.doChange();
  }

  openProperty(content: any, typeIndex: number): void {
    this.property = {
      name: '',
      description: '',
      type: 'string',
    };

    this.modalService.open(content, {size: 'lg'}).result.then((result) => {
      const property = Object.assign({}, this.property);

      if (!property.name.match(/^[A-Za-z0-9_$]{1,32}$/)) {
        this.response = {
          success: false,
          message: 'Property name must match the regular expression [A-Za-z0-9_$]{1,32}'
        };
        return;
      }

      this.specification.types[typeIndex].properties?.push(property);
      this.dirty = true;
      this.doChange();
    }, (reason) => {
    });
  }

  editProperty(content: any, typeIndex: number, propertyIndex: number): void {
    const props = this.specification.types[typeIndex].properties;
    if (!props) {
      return;
    }

    this.property = Object.assign({}, props[propertyIndex]);

    this.modalService.open(content, {size: 'lg'}).result.then((result) => {
      const property = Object.assign({}, this.property);

      if (!property.name.match(/^[A-Za-z0-9_$]{1,32}$/)) {
        this.response = {
          success: false,
          message: 'Property name must match the regular expression [A-Za-z0-9_$]{1,32}'
        };
        return;
      }

      props[propertyIndex] = property;
      this.dirty = true;
      this.doChange();
    }, (reason) => {
    });
  }

  deleteProperty(typeIndex: number, propertyIndex: number): void {
    if (!this.specification.types[typeIndex]) {
      return;
    }
    this.specification.types[typeIndex].properties?.splice(propertyIndex, 1);
    this.dirty = true;
    this.doChange();
  }

  deleteInclude(includeIndex: number): void {
    this.specification.imports.splice(includeIndex, 1);
    this.dirty = true;
    this.doChange();
  }

  async loadIncludeVersions(): Promise<void> {
    const document = this.include.document;
    if (!document || !document.user?.name || !document.name) {
      return;
    }

    this.includeVersions = [];

    const tags = await this.typeHubService.findTags(document.user?.name, document.name);
    tags.entry?.forEach((tag) => {
      if (!tag.version) {
        return;
      }

      this.includeVersions.push(tag.version);
    });
  }

  openSettings(content: any): void {
    this.baseUrl = this.specification.baseUrl || '';
    this.security = this.specification.security || {
      type: 'none'
    };

    this.modalService.open(content, {size: 'lg'}).result.then(async (result) => {
      this.specification.baseUrl = this.baseUrl;

      const availableType = ['httpBasic', 'httpBearer', 'apiKey', 'oauth2'];
      if (this.security?.type && availableType.includes(this.security?.type)) {
        this.specification.security = this.security;
      } else {
        this.specification.security = undefined;
      }

      this.dirty = true;
      this.doChange();
    }, (reason) => {
    });
  }

  openInclude(content: any): void {
    this.include = {
      alias: '',
      version: '',
      document: undefined,
      types: []
    };

    this.modalService.open(content, {size: 'lg'}).result.then(async (result) => {
      const include = this.include;
      include.types = await this.resolveIncludeTypes(include);
      this.specification.imports.push(include);

      this.dirty = true;
      this.doChange();
    }, (reason) => {
    });
  }

  private async resolveIncludeTypes(include: Include|undefined): Promise<Array<Type>|undefined> {
    if (!include || !include.document || !include.version) {
      return;
    }

    if (!include.document.user?.name || !include.document.name) {
      return;
    }

    const doc = await this.typeHubService.findDocument(include.document.user?.name, include.document.name);
    if (!doc) {
      return;
    }

    const typeApi = await this.typeHubService.export(include.document.user?.name, include.document.name, include.version);
    if (!typeApi) {
      return;
    }

    const spec = await this.importService.transform('typeapi', typeApi);
    if (!spec) {
      return;
    }

    return spec.types;
  }

  openImport(content: any): void {
    this.import = '';

    this.modalService.open(content).result.then(async (result) => {
      this.loading = true;

      const spec = await this.importService.transform(this.importType, this.import);

      this.specification.imports = spec.imports;
      this.specification.operations = spec.operations;
      this.specification.types = spec.types;
      this.specification.root = spec.root;

      this.loading = false;
      this.dirty = true;
      this.import = '';
      this.doChange();
    }, (reason) => {
    });
  }

  openExport(content: any): void {
    this.export = JSON.stringify(this.specification, null, 2);

    this.modalService.open(content).result.then((result) => {
    }, (reason) => {
    });
  }

  openToc(content: any) {
    this.offCanvasService.open(content, { ariaLabelledBy: 'offcanvas-basic-title' }).result.then(
      (result) => {
        this.viewportScroller.scrollToAnchor(result);
      },
      (reason) => {
      },
    );
  }
}
