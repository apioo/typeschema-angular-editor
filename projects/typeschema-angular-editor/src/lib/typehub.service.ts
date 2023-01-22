import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {DocumentCollection} from "typehub-javascript-sdk/dist/src/DocumentCollection";
import {Document} from "typehub-javascript-sdk/dist/src/Document";
import {Observable} from 'rxjs';
import {TagCollection} from "typehub-javascript-sdk/dist/src/TagCollection";

@Injectable({
  providedIn: 'root'
})
export class TypeHubService {

  private baseUrl: string = 'https://api.typehub.cloud/';

  constructor(private httpClient: HttpClient) { }

  public findDocuments(search?: string): Observable<DocumentCollection> {
    return this.httpClient.get<DocumentCollection>(this.baseUrl + 'explore', {
      params: {
        startIndex: 0,
        search: search ?? ''
      },
    });
  }

  public findDocument(user: string, name: string, version: string): Observable<Document> {
    return this.httpClient.get<Document>(this.baseUrl + 'document/' + user + '/' + name + '?version=' + version);
  }

  public findTags(user: string, name: string): Observable<TagCollection> {
    return this.httpClient.get<TagCollection>(this.baseUrl + 'document/' + user + '/' + name + '/tag');
  }

}
