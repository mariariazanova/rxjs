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
      .get(`${this.apiHostUrl}maintenance-service/appconfigurations/${this.applicationBuildName}`, {   //отправляется запрос для получения данных
        headers: { [ignoreAuthorizationHeader]: 'true' },
      })
      .pipe(                                                                                           //применяется метод для объединения операторов
        tap((appSettings: AppSettings) => {                                                            //оператор позволяет осуществить побочные действия, не затрагивая поток
          this.authSettingsService.authSettings.next(appSettings);                                     //сигнал о том, что поток authSettings испустил новое значение appSettings
        }),
        switchMap(() => {                                                                              //переключается на новый поток, подписывается на него, отписывается от старого
          const guards = <Token[]>route.data.dependentGuards;                                          //получение зависимых гвардов в зависимости от рута

          return combineLatest(                                                                        //получает последние значения из последовательности при испускании значений
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
          ).pipe(map(params => params.every(value => Boolean(value))));                                 //проходит по массиву значений и заменяет все их параметры на их булевы значения
        }),
      );
  }
}
