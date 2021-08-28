import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, CanDeactivate, RouterStateSnapshot, UrlTree} from '@angular/router';
import {Observable} from 'rxjs';
import {EditorComponent} from '../editor.component';

@Injectable({
  providedIn: 'root'
})
export class EditorConfirmSaveGuard implements CanDeactivate<unknown> {
  canDeactivate(
    component: unknown,
    currentRoute: ActivatedRouteSnapshot,
    currentState: RouterStateSnapshot,
    nextState?: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    if (component instanceof EditorComponent) {
      if (component.dirty) {
        if (confirm('The editor contains unsaved changes. Please confirm that you actually want to lose these changes.')) {
          return true;
        } else {
          return false;
        }
      }
    }

    return true;
  }

}
