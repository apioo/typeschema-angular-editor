import {Component, signal} from '@angular/core';
import {ExportService} from "../../../projects/typeschema-angular-editor/src/lib/export.service";
import {Specification} from "../../../projects/typeschema-angular-editor/src/lib/model/Specification";
import {TypeschemaEditorModule} from "../../../projects/typeschema-angular-editor/src/lib/typeschema-editor.module";
import {ImportService} from "../../../projects/typeschema-angular-editor/src/lib/import.service";
import {FormsModule} from "@angular/forms";

@Component({
  selector: 'app-sandbox',
  templateUrl: './sandbox.component.html',
  imports: [
    TypeschemaEditorModule,
    FormsModule
  ],
  styleUrls: ['./sandbox.component.css']
})
export class SandboxComponent {

  spec: Specification = {
    imports: [],
    operations: [],
    types: [],
  };

  debug = signal<boolean>(false);

  internal = signal<string>('');
  external = signal<string>('');

  constructor(private exportService: ExportService, private importService: ImportService) { }

  async change(spec: Specification) {
    if (this.debug()) {
      const external = JSON.stringify(this.exportService.transform(spec), null, 2);

      this.external.set(external);

      const internal = await this.importService.transform('typeschema', external);

      this.internal.set(JSON.stringify(internal, null, 2));
    }
  }

}
