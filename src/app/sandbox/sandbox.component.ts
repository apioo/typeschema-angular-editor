import {Component} from '@angular/core';
import {ExportService} from "../../../projects/typeschema-angular-editor/src/lib/export.service";
import {Specification} from "../../../projects/typeschema-angular-editor/src/lib/model/Specification";
import {TypeschemaEditorModule} from "../../../projects/typeschema-angular-editor/src/lib/typeschema-editor.module";

@Component({
  selector: 'app-sandbox',
  templateUrl: './sandbox.component.html',
  imports: [
    TypeschemaEditorModule
  ],
  styleUrls: ['./sandbox.component.css']
})
export class SandboxComponent {

  spec: Specification = {
    imports: [],
    operations: [],
    types: [],
  };

  preview?: string

  constructor(private exportService: ExportService) { }

  change(spec: Specification) {
    this.preview = JSON.stringify(this.exportService.transform(spec), null, 2);
  }

}
