import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Document_Collection} from './typehub/Document_Collection';
import {Document} from './typehub/Document';
import {Observable} from 'rxjs';
import {Tag_Collection} from './typehub/Tag_Collection';

@Injectable({
  providedIn: 'root'
})
export class TypeHubService {

  private baseUrl: string = 'https://typehub.cloud/';

  constructor(private httpClient: HttpClient) { }

  public findDocuments(search?: string): Observable<Document_Collection> {
    return this.httpClient.get<Document_Collection>(this.baseUrl + 'explore', {
      params: {
        search: search ?? ''
      },
    });
  }

  public findDocument(user: string, name: string): Observable<Document> {
    return this.httpClient.get<Document>(this.baseUrl + 'document/' + user + '/' + name);
  }

  public findTags(user: string, name: string): Observable<Tag_Collection> {
    return this.httpClient.get<Tag_Collection>(this.baseUrl + 'document/' + user + '/' + name + '/tag');
  }

}
