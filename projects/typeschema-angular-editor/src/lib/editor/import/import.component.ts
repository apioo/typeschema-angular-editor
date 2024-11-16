import {Component, Input, OnInit} from '@angular/core';

@Component({
  selector: 'typeschema-import',
  templateUrl: './import.component.html',
  styleUrls: ['./import.component.css']
})
export class ImportComponent implements OnInit {

  @Input() url!: string;

  href: string = '';

  constructor() { }

  ngOnInit(): void {
    const url = new URL(this.url);
    if (url.protocol === 'typehub:') {
      this.href = 'https://app.typehub.cloud/d/' + url.username + '/' + url.password + '?version=' + url.hostname;
    } else {
      this.href = url.href;
    }
  }

}
