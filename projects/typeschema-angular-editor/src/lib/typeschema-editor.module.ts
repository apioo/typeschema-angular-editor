import { NgModule } from '@angular/core';
import {EditorComponent} from "./editor/editor.component";
import {NgbModule} from "@ng-bootstrap/ng-bootstrap";
import {CommonModule} from "@angular/common";
import {FormsModule} from "@angular/forms";
import {ArgumentComponent} from "./editor/argument/argument.component";
import {LinkComponent} from "./editor/link/link.component";
import {ThrowComponent} from "./editor/throw/throw.component";
import {ImportComponent} from "./editor/import/import.component";

@NgModule({
  declarations: [
    ArgumentComponent,
    LinkComponent,
    ImportComponent,
    ThrowComponent,
    EditorComponent
  ],
  imports: [
    NgbModule,
    CommonModule,
    FormsModule
  ],
  exports: [
    EditorComponent
  ]
})
export class TypeschemaEditorModule { }
