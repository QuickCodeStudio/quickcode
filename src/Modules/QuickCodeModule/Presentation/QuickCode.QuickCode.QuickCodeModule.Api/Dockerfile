FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 80

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG PIPELINE_ID=1 

WORKDIR /build
COPY . .

WORKDIR /src
RUN if [ -f "/build/src/Modules/QuickCodeModule/Presentation/QuickCode.QuickCode.QuickCodeModule.Api/QuickCode.QuickCode.QuickCodeModule.Api.csproj" ]; then \
      cp -a /build/src/. .; \
    elif [ -f "/build/Modules/QuickCodeModule/Presentation/QuickCode.QuickCode.QuickCodeModule.Api/QuickCode.QuickCode.QuickCodeModule.Api.csproj" ]; then \
      cp -a /build/. .; \
    else \
      echo "QuickCode.QuickCode.QuickCodeModule.Api.csproj not found in build context" >&2; \
      find /build -name "QuickCode.QuickCode.QuickCodeModule.Api.csproj" 2>/dev/null || true; \
      exit 1; \
    fi

WORKDIR "/src/Modules/QuickCodeModule/Presentation/QuickCode.QuickCode.QuickCodeModule.Api"

RUN dotnet restore "QuickCode.QuickCode.QuickCodeModule.Api.csproj"

FROM build AS publish
RUN dotnet publish "QuickCode.QuickCode.QuickCodeModule.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false /p:AssemblyVersion=1.0.0.${PIPELINE_ID} /p:GenerateCode=NO 

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .

ENTRYPOINT ["dotnet", "QuickCode.QuickCode.QuickCodeModule.Api.dll"]
