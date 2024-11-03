import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {TypeHubService} from "../../typehub.service";
import {ImportService} from "../../import.service";
import {BCLayerService} from "../../bclayer.service";
import {NgbModal, NgbOffcanvas} from "@ng-bootstrap/ng-bootstrap";
import {ViewportScroller} from "@angular/common";

@Component({
  selector: 'typeschema-link',
  templateUrl: './link.component.html',
  styleUrls: ['./link.component.css']
})
export class LinkComponent implements OnInit {

  @Input() type!: string;
  @Input() linkable!: boolean;

  constructor(private viewportScroller: ViewportScroller) { }

  ngOnInit(): void {
  }

  scrollTo(type: string): void {
    this.viewportScroller.scrollToAnchor('type-' + type);
  }

}
