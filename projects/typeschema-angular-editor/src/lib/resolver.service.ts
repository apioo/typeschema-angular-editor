import {Injectable} from '@angular/core';
import {Include} from "./model/Include";
import {Type} from "./model/Type";
import {firstValueFrom} from "rxjs";
import {TypeHubService} from "./typehub.service";
import {HttpClient} from "@angular/common/http";
import {TypeSchema} from "./transformer/TypeSchema";
import {TransformerInterface} from "./transformer/TransformerInterface";
import {NamingService} from "./naming.service";

@Injectable({
  providedIn: 'root'
})
export class ResolverService {

  private transformer: TransformerInterface;
  constructor(private typeHubService: TypeHubService, private httpClient: HttpClient, namingService: NamingService) {
    this.transformer = new TypeSchema(typeHubService, this, namingService);
  }

  public async resolveIncludeTypes(include: Include|undefined): Promise<Array<Type>|undefined> {
    if (!include || !include.url) {
      return;
    }

    const url = new URL(include.url);

    let typeApi = null;
    if (url.protocol === 'typehub:') {
      const doc = await this.typeHubService.findDocument(url.username, url.password);
      if (!doc) {
        return;
      }

      typeApi = await this.typeHubService.export(url.username, url.password, url.hostname);
      if (!typeApi) {
        return;
      }
    } else if (url.protocol === 'http:' || url.protocol === 'https:') {
      typeApi = await firstValueFrom(this.httpClient.get(url.href, {responseType: 'text'}));
    }

    if (!typeApi) {
      return;
    }

    const spec = await this.transformer.transform(typeApi);
    if (!spec) {
      return;
    }

    return spec.types;
  }

}
