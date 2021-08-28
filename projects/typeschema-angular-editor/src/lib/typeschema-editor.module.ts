import { NgModule } from '@angular/core';
import {EditorComponent} from "./editor/editor.component";
import {NgbModule} from "@ng-bootstrap/ng-bootstrap";
import {CommonModule} from "@angular/common";
import {FormsModule} from "@angular/forms";

@NgModule({
  declarations: [
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
