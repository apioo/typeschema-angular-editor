import {Component, ElementRef, EventEmitter, Input, OnInit, Output, TemplateRef, ViewChild} from '@angular/core';
import {NgbModal} from '@ng-bootstrap/ng-bootstrap';
import {Message} from "typehub-javascript-sdk";
import {Specification} from "../model/Specification";
import {Type} from "../model/Type";
import {Property} from "../model/Property";
import {Include} from "../model/Include";
import {ImportService, SchemaType} from "../import.service";
import {Operation} from "../model/Operation";
import {Security} from "../model/Security";
import {BCLayerService} from "../bclayer.service";
import {ResolverService} from "../resolver.service";
import Fuse, {FuseResult} from "fuse.js";

@Component({
  standalone: false,
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

  search: string = '';
  searchList: Array<FuseResult<Operation|Type>> = [];

  historyBack: Array<string> = [];
  historyForward: Array<string> = [];

  selected?: Operation|Type;
  selectedIndex?: number;

  openModal: boolean = false;
  loading: boolean = false;
  dirty: boolean = false;
  response?: Message;
  includeResponse?: Message;

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

  operationValidator = /^[A-Za-z0-9_.]{1,128}$/;
  typeValidator = /^[A-Za-z0-9_]{1,128}$/;
  propertyValidator = /^[A-Za-z0-9_.$]{1,128}$/;

  constructor(private importService: ImportService, private resolverService: ResolverService, private bcLayerService: BCLayerService, private modalService: NgbModal) { }

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

    this.doInitialize();
  }

  doInitialize(): void {
    this.doChange();
    this.doSearch();

    if (this.searchList.length > 0) {
      this.selectByName(this.searchList[0].item.name);
    }
  }

  doSave(): void {
    this.save.emit(this.specification);
    this.dirty = false;
  }

  doChange(): void {
    this.saveToLocalStorage();
    this.change.emit(this.specification);
  }

  doSearch(): void {
    const allList: Array<Operation|Type> = [];

    if (this.operationEnabled) {
      this.specification.operations.forEach((operation) => {
        allList.push(operation);
      });
    }

    this.specification.types.forEach((type) => {
      allList.push(type);
    });

    if (this.search) {
      const fuse = new Fuse(allList, {
        keys: [
          'name',
          'description',
          'httpPath',
          'arguments.name',
          'arguments.description',
          'properties.name',
          'properties.description',
        ]
      });

      this.searchList = fuse.search(this.search);
    } else {
      this.searchList = [];
      allList.forEach((item, refIndex) => {
        this.searchList.push({
          item: item,
          refIndex: refIndex,
        });
      });
    }
  }

  doHistoryBack() {
    const name = this.historyBack.pop();
    if (name) {
      if (this.selected) {
        this.historyForward.push(this.selected.name);
      }

      this.selectedIndex = undefined;
      this.selected = undefined;
      this.selectByName(name);
    }
  }

  doHistoryForward() {
    const name = this.historyForward.pop();
    if (name) {
      if (this.selected) {
        this.historyBack.push(this.selected.name);
      }

      this.selectedIndex = undefined;
      this.selected = undefined;
      this.selectByName(name);
    }
  }

  setRoot(typeIndex: number) {
    this.specification.root = typeIndex;
    this.dirty = true;

    this.doChange();
  }

  orderOperations() {
    this.specification.operations.sort((left: Operation, right: Operation) => {
      return left.name.localeCompare(right.name);
    });
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

      if (!operation.name.match(this.operationValidator)) {
        this.response = {
          success: false,
          message: 'Operation name must match the regular expression: ' + this.operationValidator.source
        };
        return;
      }

      if (this.findOperationIndexByName(operation.name) !== -1) {
        this.response = {
          success: false,
          message: 'Operation name already exists, please select a different name'
        };
        return;
      }

      this.specification.operations.push(operation);
      this.dirty = true;
      this.openModal = false;

      this.orderOperations();
      this.selectByName(operation.name);
      this.doChange();
      this.doSearch();
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

      if (!operation.name.match(this.operationValidator)) {
        this.response = {
          success: false,
          message: 'Operation name must match the regular expression: ' + this.operationValidator.source
        };
        return;
      }

      this.specification.operations[operationIndex] = operation;
      this.dirty = true;
      this.openModal = false;

      this.orderOperations();
      this.selectByName(operation.name);
      this.doChange();
      this.doSearch();
    }, (reason) => {
      this.openModal = false;
    });
  }

  isOperation(object: Operation|Type): object is Operation {
    return 'httpMethod' in object;
  }

  isType(object: Operation|Type): object is Type {
    return !('httpMethod' in object);
  }

  orderTypes() {
    this.specification.types.sort((left: Type, right: Type) => {
      return left.name.localeCompare(right.name);
    });
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

      if (!type.name.match(this.typeValidator)) {
        this.response = {
          success: false,
          message: 'Type name must match the regular expression: ' + this.typeValidator.source
        };
        return;
      }

      if (this.findTypeIndexByName(type.name) !== -1) {
        this.response = {
          success: false,
          message: 'Type name already exists, please select a different name'
        };
        return;
      }

      this.specification.types.push(type);
      this.dirty = true;
      this.openModal = false;

      this.orderTypes();
      this.selectByName(type.name);
      this.doChange();
      this.doSearch();
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

      if (!type.name.match(this.typeValidator)) {
        this.response = {
          success: false,
          message: 'Type name must match the regular expression: ' + this.typeValidator.source
        };
        return;
      }

      this.specification.types[typeIndex] = type;
      this.dirty = true;
      this.openModal = false;

      this.orderTypes();
      this.selectByName(type.name);
      this.doChange();
      this.doSearch();
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

  select(object: Operation|Type|undefined): void {
    if (object === undefined) {
    } else if (this.isOperation(object)) {
      this.selectByName(object.name);
    } else if (this.isType(object)) {
      this.selectByName(object.name);
    }
  }

  selectByName(name: string) {
    if (this.selected) {
      // in case we have already a selection add to history
      this.historyBack.push(this.selected.name);
    }

    const operationIndex = this.findOperationIndexByName(name);
    if (operationIndex !== -1) {
      this.selectedIndex = operationIndex;
      this.selected = this.specification.operations[operationIndex];
    }

    const typeIndex = this.findTypeIndexByName(name);
    if (typeIndex !== -1) {
      this.selectedIndex = typeIndex;
      this.selected = this.specification.types[typeIndex];
    }
  }

  selectTypeByName(name: string) {
    if (name === 'string' || name === 'number' || name === 'integer' || name === 'boolean' || name === 'generic' || name === 'any') {
      return;
    }

    this.selectByName(name);
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

  findOperationIndexByName(operationName: string): number {
    for (let i = 0; i < this.specification.operations.length; i++) {
      if (this.specification.operations[i].name === operationName) {
        return i;
      }
    }

    return -1;
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

  findTypeIndexByName(typeName: string): number {
    for (let i = 0; i < this.specification.types.length; i++) {
      if (this.specification.types[i].name === typeName) {
        return i;
      }
    }

    return -1;
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
    const operation = this.specification.operations[operationIndex];
    if (!operation) {
      return;
    }

    this.specification.operations.splice(operationIndex, 1);
    this.dirty = true;

    this.orderOperations();
    this.doChange();
    this.doSearch();
  }

  copyOperation(operationIndex: number): void {
    if (!this.specification.operations[operationIndex]) {
      return;
    }

    let newOperation = JSON.parse(JSON.stringify(this.specification.operations[operationIndex]));
    let newName = newOperation.name + '_copy';
    let i = 0;
    while (this.findOperationIndexByName(newName) !== -1) {
      i++;
      newName = newOperation.name + '_copy' + i;
    }
    newOperation.name = newName;

    this.specification.operations.push(newOperation);
    this.dirty = true;

    this.selectByName(newOperation.name);
    this.doChange();
    this.doSearch();
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
    const type = this.specification.types[typeIndex];
    if (!type) {
      return;
    }

    this.specification.types.splice(typeIndex, 1);
    this.dirty = true;

    this.orderTypes();
    this.doChange();
    this.doSearch();
  }

  copyType(typeIndex: number): void {
    if (!this.specification.types[typeIndex]) {
      return;
    }

    let newType = JSON.parse(JSON.stringify(this.specification.types[typeIndex]));
    let newName = newType.name + '_copy';
    let i = 0;
    while (this.findTypeIndexByName(newName) !== -1) {
      i++;
      newName = newType.name + '_copy' + i;
    }
    newType.name = newName;

    this.specification.types.push(newType);
    this.dirty = true;

    this.selectByName(newType.name);
    this.doChange();
    this.doSearch();
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
      nullable: true,
      type: 'string',
      metadata: {},
    };

    this.modalService.open(content, {size: 'lg'}).result.then((result) => {
      const property = Object.assign({}, this.property);

      if (!property.name.match(this.propertyValidator)) {
        this.response = {
          success: false,
          message: 'Property name must match the regular expression: ' + this.propertyValidator.source
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

    if (typeof this.property.nullable !== 'boolean') {
      this.property.nullable = true;
    }

    if (this.property.metadata === undefined) {
      this.property.metadata = {};
    }

    this.modalService.open(content, {size: 'lg'}).result.then((result) => {
      const property = Object.assign({}, this.property);

      if (!property.name.match(this.propertyValidator)) {
        this.response = {
          success: false,
          message: 'Property name must match the regular expression: ' + this.propertyValidator.source
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
    this.includeResponse = undefined;
    this.include = {
      alias: '',
      url: '',
      types: []
    };

    this.modalService.open(content, {size: 'lg'}).result.then(async (result) => {
      this.openModal = false;
    }, (reason) => {
      this.openModal = false;
    });
  }

  async addInclude(include: Include): Promise<void> {
    const newInclude = Object.assign({}, include);

    this.include = {
      alias: '',
      url: '',
      types: []
    };

    try {
      newInclude.types = await this.resolverService.resolveIncludeTypes(newInclude);
      this.specification.imports.push(newInclude);

      this.dirty = true;

      this.doChange();
    } catch (error) {
      this.includeResponse = {
        success: false,
        message: 'Could not include document: ' + error
      };
    }
  }

  deleteInclude(includeIndex: number): void {
    this.specification.imports.splice(includeIndex, 1);
    this.dirty = true;

    this.doChange();
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

      this.doInitialize();
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

  loadFromLocalStorage() {
    let spec = localStorage.getItem(this.getLocalStorageName());
    if (spec) {
      this.specification = JSON.parse(spec);
      this.dirty = true;

      this.doInitialize();
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
