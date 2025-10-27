import {Specification} from "../model/Specification";
import {TypeHubService} from "../typehub.service";
import {Include} from "../model/Include";
import {Type} from "../model/Type";
import {Property} from "../model/Property";
import {pascalCase} from "change-case";
import {TransformerInterface} from "./TransformerInterface";
import {ResolverService} from "../resolver.service";
import {NamingService} from "../naming.service";

export class TypeSchema implements TransformerInterface {

  anonymousObjects: Record<string, any> = {};

  protected scalarTypes = ['string', 'integer', 'number', 'boolean', 'any'];

  constructor(protected typeHubService: TypeHubService, protected resolverService: ResolverService, protected namingService: NamingService) {
  }

  async transform(schema: string): Promise<Specification> {
    return this.build(JSON.parse(schema));
  }

  protected async build(data: Record<string, any>) {
    this.anonymousObjects = {};

    const typeNames: Array<string> = [];
    const spec: Specification = {
      imports: [],
      operations: [],
      types: []
    };

    const rawImport = this.get(data, ['import', '$import']);
    if (typeof rawImport === 'object') {
      for (const [key, value] of Object.entries(rawImport)) {
        const include = await this.transformImport(key, value);
        if (include) {
          spec.imports.push(include);
        }
      }
    }

    const definitions = this.get(data, ['definitions', '$defs']);
    if (typeof definitions === 'object') {
      for (const [key, value] of Object.entries(definitions)) {
        try {
          spec.types.push(await this.transformType(key, value as Record<string, any>));
          typeNames.push(key);
        } catch (error) {
        }
      }
    }

    if (this.isset(data['components']) && this.isset(data['components']['schemas']) && typeof data['components']['schemas'] === 'object') {
      for (const [key, value] of Object.entries(data['components']['schemas'])) {
        try {
          spec.types.push(await this.transformType(key, value as Record<string, any>));
          typeNames.push(key);
        } catch (error) {
        }
      }
    }

    for (const [key, value] of Object.entries(this.anonymousObjects)) {
      try {
        spec.types.push(await this.transformType(key, value));
        typeNames.push(key);
      } catch (error) {
      }
    }

    if (this.isset(data['properties']) && typeof data['properties'] === 'object') {
      // it looks like we have a root data we try to convert
      let key = 'Root';
      if (this.isset(data['title']) && typeof data['title'] === 'string') {
        key = pascalCase(data['title']);
      }

      spec.types.push(await this.transformType(key, {
        description: data['description'],
        type: 'struct',
        properties: data['properties'],
      }));
      typeNames.push(key);
      spec.root = spec.types.length - 1;
    }

    const root = this.get(data, ['root', '$ref']);
    if (root === 'string') {
      const index = typeNames.indexOf(root);
      if (index !== -1) {
        spec.root = index;
      }
    }

    return spec;
  }

  private async transformImport(alias: string, url: any): Promise<Include|undefined> {
    if (typeof url !== 'string') {
      return;
    }

    let include: Include = {
      alias: alias,
      url: url,
    };

    include.types = await this.resolverService.resolveIncludeTypes(include);

    return include;
  }

  protected async transformType(name: string, data: Record<string, any>): Promise<Type> {
    let type: Type;

    if (this.isset(data['$ref'])) {
      data['type'] = 'reference';
      data['target'] = data['$ref'];
    } else if (this.isset(data['additionalProperties'])) {
      data['type'] = 'map';
      data['schema'] = data['additionalProperties'];
    } else if (this.isset(data['items'])) {
      data['type'] = 'array';
      data['schema'] = data['items'];
    }

    if (this.isset(data['$extends'])) {
      data['extends'] = {
        type: 'reference',
        target: data['$extends'],
      }
    }

    if (this.isset(data['$template'])) {
      data['template'] = data['$template'];
    }

    const typeName = data['type'];
    if (typeName === 'reference') {
      type = {
        type: 'reference',
        name: name,
        description: data['description'] && typeof data['description'] === 'string' ? data['description'] : '',
        reference: data['target']
      };

      if (this.isset(data['template'])) {
        type.template = data['template'];
      }
    } else if (typeName === 'map' || typeName === 'array') {
      type = {
        type: typeName,
        name: name,
        description: data['description'] && typeof data['description'] === 'string' ? data['description'] : '',
        reference: this.parseRef(data['schema'])
      };
    } else {
      if (typeName && this.scalarTypes.includes(typeName)) {
        throw new Error('Can not create scalar object');
      }

      type = {
        type: 'struct',
        name: name,
        description: data['description'] && typeof data['description'] === 'string' ? data['description'] : '',
      };

      if (this.isset(data['extends']) && this.isset(data['extends'].target) && typeof data['extends'].target === 'string') {
        type.parent = data['extends'].target;
      }

      if (this.isset(data['properties']) && typeof data['properties'] === 'object') {
        type.properties = [];
        for (const [key, value] of Object.entries(data['properties'])) {
          try {
            type.properties.push(await this.transformProperty(key, value as Record<string, any>));
          } catch (error) {
          }
        }
      }
    }

    return type;
  }

  private async transformProperty(name: string, data: Record<string, any>): Promise<Property> {
    if (this.isset(data['$ref'])) {
      data['type'] = 'reference';
      data['target'] = data['$ref'];
    } else if (this.isset(data['additionalProperties'])) {
      data['type'] = 'map';
      data['schema'] = data['additionalProperties'];
    } else if (this.isset(data['items'])) {
      data['type'] = 'array';
      data['schema'] = data['items'];
    }

    const typeName = data['type'];

    let type;
    let ref: string|undefined;
    let format;
    let defaultValue;
    if (this.isset(data['properties'])) {
      // in this case we have a nested object which is not supported at TypeAPI we automatically create an anonymous
      // object and use a reference
      const hash = await this.namingService.hash(JSON.stringify(data));
      const anonymousName = 'Object_' + hash;
      this.anonymousObjects[anonymousName] = data;

      type = 'object';
      ref = anonymousName;
    } else if (typeName === 'map' || typeName === 'array') {
      type = typeName;
      ref = this.parseRef(data['additionalProperties']);
    } else if (typeName === 'reference') {
      type = 'object';
      ref = data['target'];
    } else if (typeName === 'string') {
      type = 'string';
      if (this.isset(data['format'])) {
        format = data['format'];
      }
      if (this.isset(data['default'])) {
        defaultValue = data['default'];
      }
    } else if (typeName === 'integer') {
      type = 'integer';
    } else if (typeName === 'number') {
      type = 'number';
    } else if (typeName === 'boolean') {
      type = 'boolean';
    } else if (typeName === 'any') {
      type = 'any';
    } else {
      throw new Error('Could not resolve type: ' + JSON.stringify(data));
    }

    const property: Property = {
      name: name,
      description: data['description'] && typeof data['description'] === 'string' ? data['description'] : '',
      type: type,
    };

    if (this.isset(data['deprecated']) && typeof data['deprecated'] === 'boolean') {
      property.deprecated = data['deprecated'];
    }

    if (this.isset(data['nullable']) && typeof data['nullable'] === 'boolean') {
      property.nullable = data['nullable'];
    }

    if (this.isset(format) && typeof format === 'string') {
      property.format = format;
    }

    if (this.isset(defaultValue) && typeof defaultValue === 'string') {
      property.default = defaultValue;
    }

    if (ref) {
      property.reference = ref;
    }

    return property;
  }

  protected parseRef(data: any): string {
    if (this.isset(data.target) && typeof data.target === 'string') {
      return data.target;
    } else if (this.isset(data.$ref) && typeof data.$ref === 'string') {
      return this.normalizeRef(data.$ref);
    } else if (this.isset(data.$generic)) {
      return 'T';
    } else if (this.scalarTypes.includes(data.type)) {
      return data.type;
    } else if (data.type === 'array') {
      // at the moment we can not handle array inside maps but we simply return the array type
      return this.parseRef(data.items);
    } else {
      throw new Error('Could not resolve ref: ' + JSON.stringify(data));
    }
  }

  protected isset(value: any): boolean {
    return typeof value !== 'undefined' && value !== null;
  }

  protected get(object: any, keys: Array<string>): any {
    for (const key of keys) {
      if (this.isset(object[key])) {
        return object[key];
      }
    }

    return undefined;
  }

  protected normalizeRef(ref: string): string {
    return ref
      .replace('#/definitions/', '')
      .replace('#/$defs/', '');
  }

}
