import {Component, ElementRef, EventEmitter, HostListener, Input, OnInit, Output, TemplateRef, ViewChild} from '@angular/core';
import {NgbModal, NgbOffcanvas} from '@ng-bootstrap/ng-bootstrap';
import {Message} from "typehub-javascript-sdk";
import {Specification} from "../model/Specification";
import {Type} from "../model/Type";
import {Property} from "../model/Property";
import {Include} from "../model/Include";
import {ImportService, SchemaType} from "../import.service";
import {Operation} from "../model/Operation";
import {Throw} from "../model/Throw";
import {ViewportScroller} from "@angular/common";
import {Security} from "../model/Security";
import {BCLayerService} from "../bclayer.service";
import {ResolverService} from "../resolver.service";

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
  @Input() id: string = '';

  @Input() objectRef?: TemplateRef<any>;
  @Input() arrayRef?: TemplateRef<any>;
  @Input() mapRef?: TemplateRef<any>;
  @Input() stringRef?: TemplateRef<any>;
  @Input() integerRef?: TemplateRef<any>;
  @Input() numberRef?: TemplateRef<any>;
  @Input() booleanRef?: TemplateRef<any>;

  @Output() save = new EventEmitter<Specification>();
  @Output() change = new EventEmitter<Specification>();

  @ViewChild('operationModal') operationModalRef!: ElementRef;
  @ViewChild('typeModal') typeModalRef!: ElementRef;

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
    discriminator: '',
    mapping: {},
  };
  children: Array<string> = [];
  generics: Array<string> = [];

  property: Property = {
    name: '',
    description: '',
    type: 'string',
  };

  import: string = '';
  importType: SchemaType = 'internal';
  export: string = '';

  selectedType?: number;
  selectedOperation?: number;
  openModal: boolean = false;

  loading: boolean = false;
  dirty: boolean = false;
  response?: Message;

  baseUrl?: string;
  security?: Security;

  contentTypes: Array<{name: string, value: string}> = [{
    name: 'application/octet-stream',
    value: 'application/octet-stream'
  }, {
    name: 'application/x-www-form-urlencoded',
    value: 'application/x-www-form-urlencoded'
  }, {
    name: 'application/json',
    value: 'application/json'
  }, {
    name: 'multipart/form-data',
    value: 'multipart/form-data'
  }, {
    name: 'text/plain',
    value: 'text/plain'
  }, {
    name: 'application/xml',
    value: 'application/xml'
  }];

  include: Include = {
    alias: '',
    url: '',
    types: []
  };

  constructor(private importService: ImportService, private resolverService: ResolverService, private bcLayerService: BCLayerService, private modalService: NgbModal, private offCanvasService: NgbOffcanvas, private viewportScroller: ViewportScroller) { }

  async ngOnInit(): Promise<void> {
    if (!Array.isArray(this.specification.operations)) {
      this.specification.operations = [];
    }

    if (!this.readonly && this.specification.imports.length > 0) {
      for (let i = 0; i < this.specification.imports.length; i++) {
        const include = this.specification.imports[i];
        if (include && !include.types) {
          this.specification.imports[i].types = await this.resolverService.resolveIncludeTypes(include);
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
    this.saveToLocalStorage();
    this.change.emit(this.specification);
  }

  setRoot(typeIndex: number) {
    this.specification.root = typeIndex;
    this.dirty = true;
    this.doChange();
  }

  upOperation(operationIndex: number): number {
    const operation = this.specification.operations.splice(operationIndex, 1)[0];
    if (!operation) {
      return operationIndex;
    }
    this.specification.operations.splice(operationIndex - 1, 0, operation);
    this.dirty = true;
    this.doChange();
    this.viewportScroller.scrollToAnchor('operation-' + this.specification.operations[operationIndex - 1].name);
    return operationIndex - 1;
  }

  downOperation(operationIndex: number): number {
    const operation = this.specification.operations.splice(operationIndex, 1)[0];
    if (!operation) {
      return operationIndex;
    }
    this.specification.operations.splice(operationIndex + 1, 0, operation);
    this.dirty = true;
    this.doChange();
    this.viewportScroller.scrollToAnchor('operation-' + this.specification.operations[operationIndex + 1].name);
    return operationIndex + 1;
  }

  openOperation(content: any): void {
    this.openModal = true;
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
      this.openModal = false;
      this.doChange();
    }, (reason) => {
      this.openModal = false;
    });
  }

  editOperation(content: any, operationIndex: number): void {
    this.openModal = true;
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
      this.openModal = false;
      this.doChange();
    }, (reason) => {
      this.openModal = false;
    });
  }

  selectOperation(operationIndex: number): void {
    if (this.readonly) {
      return;
    }

    if (this.selectedOperation === operationIndex) {
      this.selectedOperation = undefined;
    } else {
      this.selectedOperation = operationIndex;
    }
  }

  upType(typeIndex: number): number {
    const type = this.specification.types.splice(typeIndex, 1)[0];
    if (!type) {
      return typeIndex;
    }
    this.specification.types.splice(typeIndex - 1, 0, type);
    this.dirty = true;
    this.doChange();
    this.viewportScroller.scrollToAnchor('type-' + this.specification.types[typeIndex].name);
    return typeIndex - 1;
  }

  downType(typeIndex: number): number {
    const type = this.specification.types.splice(typeIndex, 1)[0];
    if (!type) {
      return typeIndex;
    }
    this.specification.types.splice(typeIndex + 1, 0, type);
    this.dirty = true;
    this.doChange();
    this.viewportScroller.scrollToAnchor('type-' + this.specification.types[typeIndex].name);
    return typeIndex + 1;
  }

  openType(content: any): void {
    this.openModal = true;
    this.type = {
      type: 'struct',
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
      this.openModal = false;
      this.doChange();
    }, (reason) => {
      this.openModal = false;
    });
  }

  editType(content: any, typeIndex: number): void {
    this.openModal = true;
    this.type = Object.assign({}, this.specification.types[typeIndex]);

    this.updateMapping();
    this.updateGenerics();

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
      this.openModal = false;
      this.doChange();
    }, (reason) => {
      this.openModal = false;
    });
  }

  deleteTypeMapping(typeIndex: number, mappingKey: string): void {
    if (!this.specification.types[typeIndex]) {
      return;
    }

    const mapping = this.specification.types[typeIndex].mapping;
    if (!mapping) {
      return;
    }

    if (!mapping[mappingKey]) {
      return;
    }

    delete mapping[mappingKey];
  }

  selectType(typeIndex: number): void {
    if (this.readonly) {
      return;
    }

    if (this.selectedType === typeIndex) {
      this.selectedType = undefined;
    } else {
      this.selectedType = typeIndex;
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (this.readonly || this.openModal) {
      return;
    }

    if (event.altKey && event.key === 'q' && this.selectedOperation !== undefined) {
      this.editOperation(this.operationModalRef, this.selectedOperation);
    } else if (event.altKey && event.key === 'a' && this.selectedOperation !== undefined) {
      this.deleteOperation(this.selectedOperation);
    } else if (event.altKey && event.key === 'y') {
      this.openOperation(this.operationModalRef);
    } else if (event.altKey && event.key === 'w' && this.selectedOperation !== undefined) {
      this.selectedOperation = this.upOperation(this.selectedOperation);
    } else if (event.altKey && event.key === 's' && this.selectedOperation !== undefined) {
      this.selectedOperation = this.downOperation(this.selectedOperation);
    } else if (event.altKey && event.key === 'e' && this.selectedType !== undefined) {
      this.editType(this.typeModalRef, this.selectedType);
    } else if (event.altKey && event.key === 'd' && this.selectedType !== undefined) {
      this.deleteType(this.selectedType);
    } else if (event.altKey && event.key === 'c') {
      this.openType(this.typeModalRef);
    } else if (event.altKey && event.key === 'r' && this.selectedType !== undefined) {
      this.selectedType = this.upType(this.selectedType);
    } else if (event.altKey && event.key === 'f' && this.selectedType !== undefined) {
      this.selectedType = this.downType(this.selectedType);
    }
  }

  findGenerics(type?: Type|null): Array<string> {
    if (!type) {
      return [];
    }

    const properties = type.properties;
    if (!properties) {
      return [];
    }

    let result: Array<string> = [];
    for (let i = 0; i < properties.length; i++) {
      const generic = properties[i].generic;
      if (generic) {
        result.push(generic);
      }
    }

    return result;
  }

  findOperationByName(operationName: string): Operation|null {
    for (let i = 0; i < this.specification.operations.length; i++) {
      if (this.specification.operations[i].name === operationName) {
        return this.specification.operations[i];
      }
    }

    return null;
  }

  isLinkableType(typeName: string): boolean {
    if (typeName === 'string' || typeName === 'number' || typeName === 'integer' || typeName === 'boolean' || typeName === 'generic' || typeName === 'any') {
      return false;
    }

    for (let i = 0; i < this.specification.types.length; i++) {
      if (this.specification.types[i].name === typeName) {
        return true;
      }
    }

    return false;
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

  findTypesWithParent(parent?: Type): Array<string> {
    if (!parent) {
      return [];
    }

    let result: Array<string> = [];
    for (let i = 0; i < this.specification.types.length; i++) {
      const type = this.specification?.types[i];
      if (type?.parent === parent.name) {
        if (type?.base) {
          const mapping = type?.mapping;
          if (mapping) {
            result = result.concat(Object.keys(mapping));
          }
        } else {
          result.push(type.name);
        }
      }
    }

    return result;
  }

  updateDiscriminator() {
    this.type.mapping = {};
    this.updateMapping();
  }

  updateMapping() {
    let existing = this.type.mapping || {};
    let mapping: Record<string, string> = {};
    this.children = this.findTypesWithParent(this.type);
    for (let i = 0; i < this.children.length; i++) {
      mapping[this.children[i]] = this.children[i] in existing ? existing[this.children[i]] : '';
    }
    this.type.mapping = mapping;
  }

  updateGenerics() {
    let existing = this.type.template || {};
    let template: Record<string, string> = {};
    this.generics = this.findGenerics(this.findTypeByName(this.type.parent || ''));
    for (let i = 0; i < this.generics.length; i++) {
      template[this.generics[i]] = this.generics[i] in existing ? existing[this.generics[i]] : '';
    }
    this.type.template = template;
  }

  updatePropertyReference() {
    if (this.property.reference !== 'generic') {
      this.property.generic = undefined;
    }
  }

  deleteOperation(operationIndex: number): void {
    this.specification.operations.splice(operationIndex, 1);
    this.dirty = true;
    this.doChange();
  }

  copyOperation(operationIndex: number): void {
    if (!this.specification.operations[operationIndex]) {
      return;
    }

    let newOperation = JSON.parse(JSON.stringify(this.specification.operations[operationIndex]));
    let newName = newOperation.name + '_copy';
    let i = 0;
    while (this.findOperationByName(newName)) {
      i++;
      newName = newOperation.name + '_copy' + i;
    }
    newOperation.name = newName;

    this.specification.operations.push(newOperation);
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

  copyType(typeIndex: number): void {
    if (!this.specification.types[typeIndex]) {
      return;
    }

    let newType = JSON.parse(JSON.stringify(this.specification.types[typeIndex]));
    let newName = newType.name + '_copy';
    let i = 0;
    while (this.findTypeByName(newName)) {
      i++;
      newName = newType.name + '_copy' + i;
    }
    newType.name = newName;

    this.specification.types.push(newType);
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
    this.openModal = true;
    this.property = {
      name: '',
      description: '',
      type: 'string',
      metadata: {},
    };

    this.modalService.open(content, {size: 'lg'}).result.then((result) => {
      const property = Object.assign({}, this.property);

      if (!property.name.match(/^[A-Za-z0-9_.$]{1,32}$/)) {
        this.response = {
          success: false,
          message: 'Property name must match the regular expression [A-Za-z0-9_.$]{1,32}'
        };
        return;
      }

      this.specification.types[typeIndex].properties?.push(property);
      this.dirty = true;
      this.openModal = false;
      this.doChange();
    }, (reason) => {
      this.openModal = false;
    });
  }

  editProperty(content: any, typeIndex: number, propertyIndex: number): void {
    const props = this.specification.types[typeIndex].properties;
    if (!props) {
      return;
    }

    this.openModal = true;
    this.property = Object.assign({}, props[propertyIndex]);

    if (this.property.metadata === undefined) {
      this.property.metadata = {};
    }

    this.modalService.open(content, {size: 'lg'}).result.then((result) => {
      const property = Object.assign({}, this.property);

      if (!property.name.match(/^[A-Za-z0-9_.$]{1,32}$/)) {
        this.response = {
          success: false,
          message: 'Property name must match the regular expression [A-Za-z0-9_.$]{1,32}'
        };
        return;
      }

      props[propertyIndex] = property;
      this.dirty = true;
      this.openModal = false;
      this.doChange();
    }, (reason) => {
      this.openModal = false;
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

  openSettings(content: any): void {
    this.openModal = true;
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
      this.openModal = false;
      this.doChange();
    }, (reason) => {
      this.openModal = false;
    });
  }

  openInclude(content: any): void {
    this.openModal = true;
    this.include = {
      alias: '',
      url: '',
      types: []
    };

    this.modalService.open(content, {size: 'lg'}).result.then(async (result) => {
      const include = this.include;
      include.types = await this.resolverService.resolveIncludeTypes(include);
      this.specification.imports.push(include);

      this.dirty = true;
      this.openModal = false;
      this.doChange();
    }, (reason) => {
      this.openModal = false;
    });
  }

  openImport(content: any): void {
    this.openModal = true;
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
      this.openModal = false;
      this.import = '';
      this.doChange();
    }, (reason) => {
      this.openModal = false;
    });
  }

  openExport(content: any): void {
    this.openModal = true;
    this.export = JSON.stringify(this.specification, null, 2);

    this.modalService.open(content).result.then((result) => {
      this.openModal = false;
    }, (reason) => {
      this.openModal = false;
    });
  }

  openToc(content: any) {
    this.openModal = true;

    this.offCanvasService.open(content, { ariaLabelledBy: 'offcanvas-basic-title' }).result.then(
      (result) => {
        this.openModal = false;
        this.viewportScroller.scrollToAnchor(result);
      },
      (reason) => {
        this.openModal = false;
      },
    );
  }

  loadFromLocalStorage() {
    let spec = localStorage.getItem(this.getLocalStorageName());
    if (spec) {
      this.specification = JSON.parse(spec);
      this.dirty = true;
      this.doChange();
    }
  }

  saveToLocalStorage() {
    if (!this.isEmptySpecification()) {
      localStorage.setItem(this.getLocalStorageName(), JSON.stringify(this.specification));
    }
  }

  private getLocalStorageName(): string {
    return 'typeschema_editor_' + this.id;
  }

  private isEmptySpecification(): boolean {
    return this.specification.imports.length === 0 && this.specification.operations.length === 0 && this.specification.types.length === 0;
  }
}
