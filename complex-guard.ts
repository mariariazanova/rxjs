@Injectable()
export class AuthSettingsGuard implements CanActivate {
  constructor(
    public injector: Injector,
    private httpClient: HttpClient,
    private authSettingsService: AuthSettingsService,
    @Inject(ApiHostUrlToken) private apiHostUrl: string,
    @Inject(ApplicationBuildName) private applicationBuildName: string,
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    return this.httpClient
      .get(`${this.apiHostUrl}maintenance-service/appconfigurations/${this.applicationBuildName}`, {
        headers: { [ignoreAuthorizationHeader]: 'true' },
      })
      .pipe(
        tap((appSettings: AppSettings) => {
          this.authSettingsService.authSettings.next(appSettings);
        }),
        switchMap(() => {
          const guards = <Token[]>route.data.dependentGuards;

          return combineLatest(
            guards.map(internalGuard => {
              const guard = this.injector.get(internalGuard);
              const result = guard.canActivate(route, state);

              if (result instanceof Observable) {
                return result;
              } else if (result instanceof Promise) {
                return from(result);
              } else {
                return of(result);
              }
            }),
          ).pipe(map(params => params.every(value => Boolean(value))));
        }),
      );
  }
}