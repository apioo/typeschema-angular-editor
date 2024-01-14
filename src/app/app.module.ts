import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import {NgbModule} from '@ng-bootstrap/ng-bootstrap';
import { SandboxComponent } from './sandbox/sandbox.component';
import {HttpClientModule} from "@angular/common/http";
import {HIGHLIGHT_OPTIONS, HighlightModule} from 'ngx-highlightjs';
import {TypeschemaEditorModule} from "../../projects/typeschema-angular-editor/src/lib/typeschema-editor.module";

@NgModule({
  declarations: [
    AppComponent,
    SandboxComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,
    NgbModule,
    HighlightModule,
    TypeschemaEditorModule
  ],
  providers: [
    {
      provide: HIGHLIGHT_OPTIONS,
      useValue: {
        coreLibraryLoader: () => import('highlight.js/lib/core'),
        lineNumbersLoader: () => import('ngx-highlightjs/line-numbers'), // Optional, only if you want the line numbers
        languages: {
          json: () => import('highlight.js/lib/languages/json'),
        },
      }
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
