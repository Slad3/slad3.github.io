import {
  Component,
  EventEmitter,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { Request } from '../../../api/request.service';
import {
  HttpClient,
  HttpErrorResponse,
  HttpEventType,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';

import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { Observable, Subject } from 'rxjs';
import { ThrowStmt, NONE_TYPE } from '@angular/compiler';

import * as Highcharts from 'highcharts';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-facebook-data-analysis',
  templateUrl: './facebook-data-analysis.component.html',
  styleUrls: [
    './facebook-data-analysis.component.css',
    '../../../stylesheets/DataAnalysis.css',
  ],
})
export class FacebookDataAnalysisComponent implements OnInit {
  dev: boolean;
  data: Object;
  backendUrl = 'https://api.benbarcaskey.com/SocialMedia/';

  maxFileSizeMB = 200;

  form: FormGroup;
  uploadStatus: Observable<number>;

  @Output() newResponse = new EventEmitter<string>();
  fileNeeded = false;

  instructionsToggle = true;
  graphsToggle = false;
  progressBarToggle = false;

  messageGraphsToggle = false;
  searchHistoryGraphsToggle = false;

  progress: number;

  constructor(
    private request: Request,
    private http: HttpClient,
    private formBuilder: FormBuilder,
    private spinner: NgxSpinnerService
  ) {
    this.form = this.formBuilder.group({
      file: [''],
    });
    if (location.host.toString() === 'localhost:4200') {
      this.dev = true;
      this.backendUrl = 'http://localhost:8091/';
    } else {
      this.dev = false;
    }

	this.instructionsToggle = true;
	console.log(this.dev);
  }

  // Graphs and Charts

  chart1: typeof Highcharts;
  chart1Options: Highcharts.Options;
  chart1NotFound: string[];

  chart2: typeof Highcharts;
  chart2Options: Highcharts.Options;
  chart2NotFound: string[];

  chart3: typeof Highcharts;
  chart3Options: Highcharts.Options;
  chart3NotFound: string[];

  chart4: typeof Highcharts;
  chart4Options: Highcharts.Options;
  chart4NotFound: string[];

  ngOnInit(): void {
    // this.progressbar =  document.getElementById('progressbar')
    // this.progressbar.innerHTML = "asdfasdf"
    this.progress = 0;
    this.instructionsToggle = true;
  }

  onFileChange(event) {
    if (event.target.files && event.target.files[0]) {
      let size = event.target.files[0].size / 1024 / 1024;
      if (size < this.maxFileSizeMB) {
        const file = event.target.files[0];
        this.form.get('file').setValue(file);
      } else {
        window.alert(
          `File over ${this.maxFileSizeMB}, cosider unzipping and deleting a bunch fo videos and pictures`
        );
      }
    }
  }

  onSubmitUpload() {
    if (this.form.get('file').value !== '') {
      this.graphsToggle = false;
      this.spinner.show();
      this.progressBarToggle = true;

      const response = this.request.uploadFile(
        this.form.get('file').value,
        this.backendUrl + 'facebook'
      );

      this.uploadStatus = response.status;

      response.status.subscribe((event) => {
        this.progress = event;
        // this.progressbar.innerHTML = event.toString();
      });
      this.data = null;
      response.file.subscribe((file) => {
        try {
          this.newResponse.emit(file);
          this.data = JSON.parse(file);
          this.loadGraphs();
        } catch (error) {
          alert('Error connecting to backend Server');
          this.spinner.hide();
        }
        this.progressBarToggle = false;
      });
    } else {
      window.alert(
        `Add a file under ${this.maxFileSizeMB} Mb before uploading`
      );
      this.fileNeeded = false;
    }
  }

  loadTestSuccess() {
    this.graphsToggle = false;
    this.spinner.show();
    this.data = null;
    let req = new HttpRequest('GET', 'http://localhost:8091/' + 'sample', {
      responseType: 'text',
    });

    this.http.request(req).subscribe(
      (event) => {
        if (event instanceof HttpResponse) {
          this.data = JSON.parse(event.body.toString());
          this.loadGraphs();
        }
      },
      (error) => {
        console.log('Error', error);
        this.data = 'Error connecting to backend server';
        this.spinner.hide();
        alert('Error Connecting to Server');
      }
    );
  }

  loadGraphs() {
    this.instructionsToggle = false;

    if (this.data['SearchHistory'] != null) {
      // Loading chart 1
      const chart1Data = [];
      this.chart1NotFound = [];
      this.data['SearchHistory'].Frequency.forEach((search) => {
        if (search.times > 7)
          chart1Data.push({
            x: search.search,
            name: search.search,
            percent: this.formatPercent(search.percent),
            y: search.times,
            times: search.times,
          });
      });

      this.chart1 = Highcharts;
      this.chart1Options = {
        title: { text: 'Search Frequency' },
        series: [
          {
            data: chart1Data,
            type: 'pie',
          },
        ],
        tooltip: {
          formatter: function (p) {
            return '<b>' + this.key + '</b>  <b>' + this.y + ' times</b>';
          },
        },
        chart: {
          renderTo: 'container',
        },
      };

      // Loading chart 2
      // Full frequency
      const chart2Data = [];
      let chart2Categories = [];
      this.chart2NotFound = [];
      this.data['SearchHistory'].DateHistogram.histogram.forEach(
        (iteration) => {
          if (iteration.searches.length > 0) {
            chart2Categories.push(iteration.date);
            chart2Data.push({
              name: iteration.date,
              y: iteration.searches.length,
            });
          }
        }
      );

      this.chart2 = Highcharts;
      this.chart2Options = {
        title: { text: 'Search Frequency All' },
        xAxis: {
          categories: chart2Categories,
        },
        series: [
          {
            data: chart2Data,
            type: 'column',
          },
        ],
        tooltip: {
          formatter: function () {
            return (
              'The value for <b>' + this.x + '</b> is <b>' + this.y + '</b>'
            );
          },
        },
      };

      // Loading chart 3
      // Top serach frequency
      const chart3Data = [];
      let chart3Categories = [];
      this.chart3NotFound = [];
      let total = 0;
      this.data['SearchHistory'].DateHistogram.histogram.forEach(
        (iteration) => {
          if (true || this.contains(chart1Data[0].name, iteration.searches)) {
            chart3Categories.push(iteration.date);
            total += this.times(chart1Data[0].name, iteration.searches);
            chart3Data.push({ name: iteration.date, y: total });
          }
        }
      );

      this.chart3 = Highcharts;
      this.chart3Options = {
        title: {
          text: `Cumulative Search Frequency for Most Searched: ${chart1Data[0].name}`,
        },
        xAxis: {
          categories: chart3Categories,
        },
        series: [
          {
            data: chart3Data,
            turboThreshold: 0,
            type: 'area',
          },
        ],
        tooltip: {
          formatter: function () {
            return (
              'The value for <b>' + this.x + '</b> is <b>' + this.y + '</b>'
            );
          },
        },
      };

      // Loading chart 4
      // Second serach frequency
      const chart4Data = [];
      let chart4Categories = [];
      this.chart4NotFound = [];
      total = 0;
      this.data['SearchHistory'].DateHistogram.histogram.forEach(
        (iteration) => {
          if (true || this.contains(chart1Data[1].name, iteration.searches)) {
            //   console.log()
            chart4Categories.push(iteration.date);
            total += this.times(chart1Data[1].name, iteration.searches);
            chart4Data.push({ name: iteration.date, y: total });
          }
        }
      );

      this.chart4 = Highcharts;
      this.chart4Options = {
        title: {
          text: `Cumulative Search Frequency for 2nd Most Searched: ${chart1Data[1].name}`,
        },
        xAxis: {
          categories: chart4Categories,
        },
        series: [
          {
            data: chart4Data,
            turboThreshold: 0,
            type: 'area',
          },
        ],
        tooltip: {
          formatter: function () {
            return (
              'The value for <b>' + this.x + '</b> is <b>' + this.y + '</b>'
            );
          },
        },
      };

      this.searchHistoryGraphsToggle = true;
    }

    if (this.data['MessageData'] != null) {
      this.messageGraphsToggle = true;
    }

    this.graphsToggle = true;
    this.spinner.hide();
  }

  contains(str: string, list: []): boolean {
    let contain = false;

    list.forEach((iter) => {
      if (iter == str) {
        contain = true;
      }
    });
    return contain;
  }

  times(str: string, list: string[]): number {
    let time = 0;
    list.forEach((iter) => {
      if (iter == str) {
        time++;
      }
    });
    return time;
  }

  formatPercent(num: number) {
    return (num * 100).toString().slice(0, 5) + '%';
  }
}
