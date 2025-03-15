import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Client, TagCollection, Document, DocumentCollection} from "typehub-javascript-sdk";
import {lastValueFrom} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class TypeHubService {

  private baseUrl: string = 'https://api.typehub.cloud/';
  private client: Client;

  constructor(private httpClient: HttpClient) {
    this.client = new Client(this.baseUrl);
  }

  public async findDocuments(search?: string): Promise<DocumentCollection> {
    return this.client.explore().getAll(0, 16, search);
  }

  public async findDocument(user: string, name: string): Promise<Document> {
    return await this.client.document().get(user, name);
  }

  public async export(user: string, name: string, version: string): Promise<string|undefined> {
    const response = await this.client.document().export(user, name, {
      version: version,
      format: 'model-typeschema'
    });

    if (!response.href) {
      return;
    }

    const schema = await lastValueFrom(this.httpClient.get<any>(response.href));
    if (typeof schema === 'string') {
      return schema;
    } else {
      return JSON.stringify(schema);
    }
  }

  public findTags(user: string, name: string): Promise<TagCollection> {
    return this.client.tag().getAll(user, name);
  }

}
