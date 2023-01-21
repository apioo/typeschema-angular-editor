import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {NgbModal} from '@ng-bootstrap/ng-bootstrap';
import {Observable, of, OperatorFunction} from 'rxjs';
import {Document} from '../typehub/Document';
import {Message} from '../typehub/Message';
import {catchError, debounceTime, distinctUntilChanged, map, switchMap, tap} from 'rxjs/operators';
import {Specification} from "../model/Specification";
import {Type} from "../model/Type";
import {Property} from "../model/Property";
import {Include} from "../model/Include";
import {TypeSchemaToInternalService} from "../typeschema-to-internal.service";
import {TypeHubService} from "../typehub.service";

@Component({
  selector: 'typeschema-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.css']
})
export class EditorComponent implements OnInit {

  @Input() specification: Specification = {
    imports: [],
    types: []
  };
  @Input() importEnabled: boolean = true;

  @Output() save = new EventEmitter<Specification>();
  @Output() preview = new EventEmitter<Specification>();

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
  export: string = '';

  dirty = false;
  response: Message|undefined;

  include: Include = {
    alias: '',
    version: 'master',
    document: undefined,
    types: []
  };
  includeVersions: Array<string> = [];
  searching = false;
  searchFailed = false;
  search: OperatorFunction<string, readonly Document[]> = (text$: Observable<string>) => {
    return text$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(() => this.searching = true),
      switchMap((term) => {
        return this.typeHubService.findDocuments(term).pipe(
          tap(() => this.searchFailed = false),
          map((collection): Array<Document> => {
            if (!collection.entry) {
              return [];
            }

            return collection.entry;
          }),
          catchError(() => {
            this.searchFailed = true;
            return of([]);
          })
        );
      }),
      tap(() => this.searching = false)
    );
  }
  formatter = (document: Document) => {
    return document.user?.name + ' / ' + document.name;
  }

  constructor(private typeHubService: TypeHubService, private schemaTransformer: TypeSchemaToInternalService, private modalService: NgbModal) { }

  ngOnInit(): void {
    this.doPreview();
  }

  doSave(): void {
    this.save.emit(this.specification);
    this.dirty = false;
  }

  doPreview(): void {
    this.preview.emit(this.specification);
  }

  setRoot(typeIndex: number) {
    this.specification.root = typeIndex;
  }

  upType(typeIndex: number): void {
    const type = this.specification.types.splice(typeIndex, 1)[0];
    if (!type) {
      return;
    }
    this.specification.types.splice(typeIndex - 1, 0, type);
    this.dirty = true;
    this.doPreview();
  }

  downType(typeIndex: number): void {
    const type = this.specification.types.splice(typeIndex, 1)[0];
    if (!type) {
      return;
    }
    this.specification.types.splice(typeIndex + 1, 0, type);
    this.dirty = true;
    this.doPreview();
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
      this.doPreview();
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
      this.doPreview();
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

  deleteType(typeIndex: number): void {
    this.specification.types.splice(typeIndex, 1);
    this.dirty = true;
    this.doPreview();
  }

  upProperty(typeIndex: number, propertyIndex: number): void {
    const property = this.specification.types[typeIndex].properties?.splice(propertyIndex, 1)[0];
    if (!property) {
      return;
    }
    this.specification.types[typeIndex].properties?.splice(propertyIndex - 1, 0, property);
    this.dirty = true;
    this.doPreview();
  }

  downProperty(typeIndex: number, propertyIndex: number): void {
    const property = this.specification.types[typeIndex].properties?.splice(propertyIndex, 1)[0];
    if (!property) {
      return;
    }
    this.specification.types[typeIndex].properties?.splice(propertyIndex + 1, 0, property);
    this.dirty = true;
    this.doPreview();
  }

  openProperty(content: any, typeIndex: number): void {
    this.property = {
      name: '',
      description: '',
      type: 'string',
    };

    this.modalService.open(content, {size: 'lg'}).result.then((result) => {
      const property = Object.assign({}, this.property);

      if (!property.name.match(/^[A-Za-z0-9_]{1,32}$/)) {
        this.response = {
          success: false,
          message: 'Property name must match the regular expression [A-Za-z0-9_]{1,32}'
        };
        return;
      }

      this.specification.types[typeIndex].properties?.push(property);
      this.dirty = true;
      this.doPreview();
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

      if (!property.name.match(/^[A-Za-z0-9_]{1,32}$/)) {
        this.response = {
          success: false,
          message: 'Property name must match the regular expression [A-Za-z0-9_]{1,32}'
        };
        return;
      }

      props[propertyIndex] = property;
      this.dirty = true;
      this.doPreview();
    }, (reason) => {
    });
  }

  deleteProperty(typeIndex: number, propertyIndex: number): void {
    if (!this.specification.types[typeIndex]) {
      return;
    }
    this.specification.types[typeIndex].properties?.splice(propertyIndex, 1);
    this.dirty = true;
    this.doPreview();
  }

  deleteInclude(includeIndex: number): void {
    this.specification.imports.splice(includeIndex, 1);
    this.dirty = true;
    this.doPreview();
  }

  loadIncludeVersions(): void {
    const document = this.include.document;
    if (!document || !document.user?.name || !document.name) {
      return;
    }

    this.includeVersions = [];
    this.typeHubService.findTags(document.user?.name, document.name).subscribe((tags) => {
      tags.entry?.forEach((tag) => {
        if (!tag.version) {
          return;
        }

        this.includeVersions.push(tag.version);
      });
    });
  }

  openInclude(content: any): void {
    this.include = {
      alias: '',
      version: '',
      document: undefined,
      types: []
    };

    this.modalService.open(content).result.then((result) => {
      const include = this.include;
      if (!include || !include.document || !include.version) {
        return;
      }

      if (!include.document.user?.name || !include.document.name) {
        return;
      }

      this.typeHubService.findDocument(include.document.user?.name, include.document.name, include.version).subscribe(doc => {
        include.types = doc.spec.types ?? [];
        this.specification.imports.push(include);
      });
    }, (reason) => {
    });
  }

  openImport(content: any): void {
    this.import = '';

    this.modalService.open(content).result.then((result) => {
      let data = JSON.parse(this.import);
      let spec: Specification;

      if (data.types && Array.isArray(data.types)) {
        // we already have an internal spec format
        spec = data;
      } else {
        // we probably get a TypeSchema so we try to convert
        spec = this.schemaTransformer.transform(data);
      }

      this.specification = spec;
      this.dirty = true;
      this.import = '';
      this.doPreview();
    }, (reason) => {
    });
  }

  openExport(content: any): void {
    this.export = JSON.stringify(this.specification, null, 2);

    this.modalService.open(content).result.then((result) => {
    }, (reason) => {
    });
  }

}
