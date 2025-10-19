import {Specification} from "../model/Specification";
import {TypeHubService} from "../typehub.service";
import {Type} from "../model/Type";
import {Property} from "../model/Property";
import {TransformerInterface} from "./TransformerInterface";
import {NamingService} from "../naming.service";

export class RawJson implements TransformerInterface {

  nestedObjects: Array<Type> = [];

  constructor(protected typeHubService: TypeHubService, protected namingService: NamingService) {
  }

  async transform(schema: string): Promise<Specification> {
    return this.build(JSON.parse(schema));
  }

  protected async build(data: Record<string, any>) {
    this.nestedObjects = [];

    const spec: Specification = {
      imports: [],
      operations: [],
      types: []
    };

    const root: Type = {
      type: 'object',
      name: await this.buildName(data),
      description: '',
      properties: [],
    };

    for (const [key, value] of Object.entries(data)) {
      const property = await this.transformValue(key, value);
      if (property !== null) {
        root.properties?.push(property);
      }
    }

    spec.types.push(root);

    for (const [key, value] of Object.entries(this.nestedObjects)) {
      spec.types.push(value);
    }

    return spec;
  }

  private async transformValue(name: string, data: any): Promise<Property|null> {
    if (data === null || data === undefined) {
      return null;
    }

    if (typeof data === 'string') {
      const isDate = new RegExp(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/, "i");
      const isDateTime = new RegExp(/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z?$/, "i");
      const isTime = new RegExp(/^[0-9]{2}:[0-9]{2}:[0-9]{2}$/, "i");

      let format = null;
      if (isDate.test(data)) {
        format = 'date';
      } else if (isDateTime.test(data)) {
        format = 'date-time';
      } else if (isTime.test(data)) {
        format = 'time';
      }

      const property: Property = {
        name: name,
        description: '',
        type: 'string',
      };

      if (format !== null) {
        property.format = format;
      }

      return property;
    } else if (typeof data === 'number') {
      if (Number.isInteger(data)) {
        return {
          name: name,
          description: '',
          type: 'integer',
        };
      } else {
        return {
          name: name,
          description: '',
          type: 'number',
        };
      }
    } else if (typeof data === 'boolean') {
      return {
        name: name,
        description: '',
        type: 'boolean',
      };
    } else if (Array.isArray(data)) {
      const firstValue = data[0] || null;
      const property = await this.transformValue('', firstValue);

      let ref = '';
      if (property?.reference) {
        ref = property?.reference || '';
      } else if (property?.type) {
        ref = property?.type;
      }

      return {
        name: name,
        description: '',
        type: 'array',
        reference: ref
      };
    } else if (typeof data === 'object') {
      const typeName = await this.buildName(data);
      const type: Type = {
        type: 'object',
        name: typeName,
        description: '',
        properties: [],
      };

      for (const [key, value] of Object.entries(data)) {
        const property = await this.transformValue(key, value);
        if (property !== null) {
          type.properties?.push(property);
        }
      }

      this.nestedObjects.push(type);

      return {
        name: name,
        description: '',
        type: 'object',
        reference: typeName
      };
    } else {
      return null;
    }
  }

  private async buildName(data: any): Promise<string> {
    const hash = await this.namingService.hash(JSON.stringify(data));
    return 'Type_' + hash;
  }

}
